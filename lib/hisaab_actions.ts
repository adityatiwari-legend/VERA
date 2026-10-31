import crypto from 'crypto';
import { AppError } from './permissions';
import {
  createPotholeReport,
  attachSolanaReportTx,
  addConfirmation,
  ensureCitizenWallet,
  getPotholeReport,
} from './hisaab';
import { saveReportMedia } from './storage';
import { analyzePotholePhoto, isGeminiConfigured } from './gemini';
import {
  onChainInitReport,
  onChainConfirmReport,
  isSolanaProgramConfigured,
  generateKeypairJson,
  keypairFromJson,
  getConnection,
  explorerTxUrl,
  requestAirdrop,
  LAMPORTS_PER_SOL,
} from './solana';
import { recordAuditLog } from './audit_log';
import { User } from '../types';

const SEVERITY_INDEX: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

/**
 * Shared report-creation flow used by BOTH the web routes and the /api/v1
 * mobile surface, so the mobile app behaves identically to the web app.
 */
export async function createPotholeReportFromForm(
  form: FormData,
  user: User
): Promise<{ report: any; explorerUrl: string | null; geminiStatus: string }> {
  const photo = form.get('photo');
  const lat = Number(form.get('latitude'));
  const lng = Number(form.get('longitude'));
  const addressLabel = (form.get('address_label') as string) || null;
  const description = String(form.get('description') || '');

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new AppError('Valid latitude is required', 400);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new AppError('Valid longitude is required', 400);
  if (!description || description.trim().length < 5) throw new AppError('Description must be at least 5 characters', 400);
  if (!(photo instanceof File) || photo.size === 0) {
    throw new AppError('A photo of the pothole is required', 400);
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
    throw new AppError('Photo must be a JPG, PNG, or WEBP image', 400);
  }

  const buffer = Buffer.from(await photo.arrayBuffer());
  const reportId = crypto.randomUUID();

  const media = await saveReportMedia(reportId, photo.name, photo.type, buffer);

  const gpsHint = addressLabel
    ? `${addressLabel} (lat ${lat}, lng ${lng})`
    : `lat ${lat}, lng ${lng}`;

  const gemini = await analyzePotholePhoto(buffer, photo.type, gpsHint);

  const report = await createPotholeReport({
    id: reportId,
    reporterId: user.id,
    latitude: lat,
    longitude: lng,
    addressLabel,
    description: description.trim(),
    severity: gemini.result?.severity ?? null,
    sizeEstimateCm: gemini.result?.size_estimate_cm ?? null,
    geminiResult: gemini.result,
    geminiStatus: gemini.status,
    media: {
      fileName: media.fileName,
      filePath: media.filePath,
      mimeType: media.mimeType,
      sha256: media.sha256Hash,
    },
  });

  let solanaTx: string | null = null;
  let solanaPda: string | null = null;
  if (isSolanaProgramConfigured() && media.sha256Hash.length === 64) {
    try {
      const res = await onChainInitReport({
        reportId,
        latitude: lat,
        longitude: lng,
        severity: SEVERITY_INDEX[gemini.result?.severity ?? 'MEDIUM'] ?? 1,
        mediaSha256: media.sha256Hash,
      });
      if (res) {
        solanaTx = res.signature;
        solanaPda = res.pda;
        await attachSolanaReportTx(reportId, res.pda, res.signature);
      }
    } catch (err) {
      console.error('Solana init_report failed (report kept off-chain registry):', err);
    }
  }

  await recordAuditLog({
    campaignId: null,
    actorId: user.id,
    action: 'HISAAB_REPORT_API_CREATED',
    entityType: 'pothole_report',
    entityId: report.id,
    metadata: {
      gemini_status: gemini.status,
      solana_configured: isSolanaProgramConfigured(),
      gemini_configured: isGeminiConfigured(),
    },
  });

  return {
    report: { ...report, solana_report_pda: solanaPda, solana_tx_hash: solanaTx },
    explorerUrl: solanaTx ? explorerTxUrl(solanaTx) : null,
    geminiStatus: gemini.status,
  };
}

/**
 * Shared citizen-confirmation flow (web + mobile).
 */
export async function confirmReportAsUser(
  reportId: string,
  user: User
): Promise<{
  count: number;
  status: string;
  inserted: boolean;
  solanaTx: string | null;
}> {
  const report = await getPotholeReport(reportId);

  let solanaTx: string | null = null;
  let solanaPda: string | null = null;

  if (isSolanaProgramConfigured()) {
    try {
      const wallet = await ensureCitizenWallet(user.id, generateKeypairJson);
      const keypair = keypairFromJson(wallet.keypairJson);

      const balance = await getConnection().getBalance(keypair.publicKey);
      if (balance < Math.floor(0.01 * LAMPORTS_PER_SOL)) {
        // Best-effort gas top-up; failure only skips the on-chain step.
        await requestAirdrop(keypair.publicKey, 0.02);
      }

      const res = await onChainConfirmReport({ reportId, confirmerKeypair: keypair });
      if (res) {
        solanaTx = res.signature;
        solanaPda = res.pda;
      }
    } catch (err) {
      console.error('Solana confirm_report failed (confirmation kept in PG):', err);
    }
  }

  const result = await addConfirmation(reportId, user.id, solanaPda, solanaTx);

  return {
    count: result.count,
    status: result.status,
    inserted: result.inserted,
    solanaTx,
  };
}
