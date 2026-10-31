import { PoolClient } from 'pg';
import { AIStatus, VerificationResult } from '../types';
import { extractDocumentData } from './gemini';

export interface ExtractedDocumentData {
  documentType: string;
  vendor: string | null;
  amount: number | null;
  date: string | null;
  invoiceNumber: string | null;
  confidence: number;
  rawText?: string;
}

export interface VerificationInputFile {
  id?: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string;
  buffer?: Buffer;
}

export interface RuleValidationOutput {
  ai_status: AIStatus;
  confidence: number;
  extracted_amount: number | null;
  extracted_date: string | null;
  extracted_vendor: string | null;
  extracted_invoice_number: string | null;
  duplicate_detected: boolean;
  discrepancy_amount: number;
  notes: string;
  raw_result: Record<string, any>;
}

/**
 * AI / OCR extraction via Gemini vision (real model call — no heuristics).
 * If Gemini is unconfigured or fails, returns an honest low-confidence result
 * that routes the proof to MANUAL_REVIEW instead of fabricating data.
 */
export async function extractDocumentMetadata(
  files: VerificationInputFile[],
  _claimedAmount: number
): Promise<ExtractedDocumentData> {
  try {
    if (!files || files.length === 0) {
      return {
        documentType: 'unknown',
        vendor: null,
        amount: null,
        date: null,
        invoiceNumber: null,
        confidence: 0,
        rawText: 'No files provided for extraction',
      };
    }

    // Primary document: prefer a PDF or image (a receipt photo is a document too)
    const docFile =
      files.find((f) => f.mimeType === 'application/pdf' || f.mimeType.startsWith('image/')) ||
      files[0];

    if (!docFile?.buffer) {
      return {
        documentType: 'unknown',
        vendor: null,
        amount: null,
        date: null,
        invoiceNumber: null,
        confidence: 0,
        rawText: 'Document content unreadable (no buffer available)',
      };
    }

    const gemini = await extractDocumentData(docFile.buffer, docFile.mimeType);
    if (!gemini.result) {
      return {
        documentType: 'unrecognized',
        vendor: null,
        amount: null,
        date: null,
        invoiceNumber: null,
        confidence: 0,
        rawText: `AI extraction unavailable (${gemini.status}). Manual human review required.`,
      };
    }

    const r = gemini.result;
    const summaryBits = [r.line_items_summary].filter(Boolean);
    return {
      documentType: r.document_type,
      vendor: r.vendor,
      amount: r.amount_inr,
      date: r.date,
      invoiceNumber: r.invoice_number,
      confidence: r.confidence,
      rawText: `Gemini vision extraction from ${docFile.fileName}${
        summaryBits.length ? `: ${summaryBits.join(' · ')}` : ''
      }`,
    };
  } catch (error: any) {
    // AI / OCR extraction failure must NEVER crash the application
    console.error('AI / OCR metadata extraction error:', error);
    return {
      documentType: 'unrecognized',
      vendor: null,
      amount: null,
      date: null,
      invoiceNumber: null,
      confidence: 0,
      rawText: `Extraction failed: ${error?.message || 'Unknown OCR error'}`,
    };
  }
}

/**
 * Deterministic Rule-Based Verification Engine
 * Performs:
 * - Discrepancy calculation: |claimed_amount - extracted_amount|
 * - Milestone allocation cap check
 * - Duplicate file hash check across existing proofs in DB
 * - Duplicate invoice number check
 * - Future / invalid date check
 * - Status determination: PASS | FLAG | FAIL | MANUAL_REVIEW | ERROR
 */
export async function runRuleBasedValidation(
  client: PoolClient,
  proofId: string,
  claimedAmount: number,
  milestoneAllocation: number,
  files: VerificationInputFile[],
  extracted: ExtractedDocumentData
): Promise<RuleValidationOutput> {
  const notes: string[] = [];
  let isDuplicate = false;
  let status: AIStatus = 'PASS';

  // 1. Check if extraction failed or confidence is 0
  if (extracted.confidence === 0 || !extracted.amount) {
    return {
      ai_status: 'MANUAL_REVIEW',
      confidence: extracted.confidence,
      extracted_amount: extracted.amount,
      extracted_date: extracted.date,
      extracted_vendor: extracted.vendor,
      extracted_invoice_number: extracted.invoiceNumber,
      duplicate_detected: false,
      discrepancy_amount: 0,
      notes: 'AI analysis unavailable or inconclusive. Manual human review required.',
      raw_result: {
        extracted,
        reason: 'Automated extraction could not read financial figures.',
      },
    };
  }

  // 2. Amount Check & Discrepancy Calculation
  const extractedAmount = extracted.amount;
  const discrepancyAmount = Math.abs(claimedAmount - extractedAmount);

  if (discrepancyAmount > 0) {
    status = 'FLAG';
    notes.push(
      `Discrepancy detected: Claimed ₹${claimedAmount.toLocaleString('en-IN')} vs Extracted ₹${extractedAmount.toLocaleString('en-IN')} (Difference: ₹${discrepancyAmount.toLocaleString('en-IN')})`
    );
  } else {
    notes.push(`Claimed amount matches extracted invoice amount (₹${claimedAmount.toLocaleString('en-IN')})`);
  }

  // 3. Milestone Allocation Cap Check
  if (claimedAmount > milestoneAllocation) {
    status = 'FLAG';
    notes.push(
      `Claimed amount (₹${claimedAmount.toLocaleString('en-IN')}) exceeds total milestone budget (₹${milestoneAllocation.toLocaleString('en-IN')})`
    );
  }

  // 4. Duplicate SHA-256 File Hash Detection in Database
  const fileHashes = files.map(f => f.sha256Hash).filter(Boolean);
  if (fileHashes.length > 0) {
    const dupHashQuery = `
      SELECT pf.id, pf.proof_id, pf.file_name, pf.sha256_hash
      FROM proof_files pf
      JOIN proofs p ON pf.proof_id = p.id
      WHERE pf.sha256_hash = ANY($1::text[])
        AND pf.proof_id != $2
      LIMIT 5
    `;
    const dupRes = await client.query(dupHashQuery, [fileHashes, proofId]);
    if (dupRes.rowCount && dupRes.rowCount > 0) {
      isDuplicate = true;
      status = 'FLAG';
      notes.push(
        `Duplicate file hash detected: One or more uploaded files share an identical SHA-256 fingerprint with proof ${dupRes.rows[0].proof_id}`
      );
    }
  }

  // 5. Duplicate Invoice Number Check
  if (extracted.invoiceNumber) {
    const dupInvQuery = `
      SELECT vr.proof_id, vr.extracted_invoice_number
      FROM verification_results vr
      WHERE vr.extracted_invoice_number = $1
        AND vr.proof_id != $2
      LIMIT 1
    `;
    const dupInvRes = await client.query(dupInvQuery, [extracted.invoiceNumber, proofId]);
    if (dupInvRes.rowCount && dupInvRes.rowCount > 0) {
      isDuplicate = true;
      status = 'FLAG';
      notes.push(
        `Duplicate invoice number detected: Invoice #${extracted.invoiceNumber} was previously submitted in proof ${dupInvRes.rows[0].proof_id}`
      );
    }
  }

  // 6. Date Check (Future Date flag)
  if (extracted.date) {
    const docDate = new Date(extracted.date);
    const today = new Date();
    // Allow up to 1 day buffer for timezones
    today.setDate(today.getDate() + 1);
    if (!isNaN(docDate.getTime()) && docDate > today) {
      status = 'FLAG';
      notes.push(`Future invoice date detected: ${extracted.date} is in the future`);
    }
  }

  if (status === 'PASS') {
    notes.push('No significant discrepancies detected by automated rule checks.');
  }

  return {
    ai_status: status,
    confidence: extracted.confidence,
    extracted_amount: extracted.amount,
    extracted_date: extracted.date,
    extracted_vendor: extracted.vendor,
    extracted_invoice_number: extracted.invoiceNumber,
    duplicate_detected: isDuplicate,
    discrepancy_amount: discrepancyAmount,
    notes: notes.join('. '),
    raw_result: {
      extracted,
      ruleChecks: {
        discrepancyAmount,
        isDuplicate,
        milestoneAllocation,
        notes,
      },
    },
  };
}
