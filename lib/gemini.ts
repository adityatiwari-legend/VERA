import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIStatus, GeminiPotholeResult, GeminiCompareResult } from '../types';

const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

let client: GoogleGenerativeAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient(): GoogleGenerativeAI | null {
  if (!isGeminiConfigured()) return null;
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  }
  return client;
}

/** One retry on transient provider errors (429/503 "high demand"). */
async function generateWithRetry(model: any, parts: any[]): Promise<any> {
  try {
    return await model.generateContent(parts);
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (/(429|503)|high demand|overloaded/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 1200));
      return model.generateContent(parts);
    }
    throw err;
  }
}

function bufferToPart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

/**
 * Best-effort JSON extraction from a model reply. Gemini can wrap JSON in
 * markdown fences; strip anything before the first { and after the last }.
 */
function extractJson<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

const POTHOLE_PROMPT = `You are an expert civil road-inspection vision AI model for an Indian municipal repair platform.
Analyze this photo taken by a citizen to determine if an actual road defect, pothole, cavity, or surface damage is present.
Examine the ACTUAL visual evidence in the image carefully and objectively.

Respond with ONLY a valid JSON object, no markdown fences, no extra text:
{
  "severity": "LOW" | "MEDIUM" | "HIGH",
  "size_estimate_cm": <number, estimated largest dimension in cm, or null if not a pothole>,
  "surface_type": <"asphalt" | "concrete" | "unpaved" | null>,
  "description_hinglish": <2-3 sentences in Hinglish (Roman script) explaining your visual inspection clearly>,
  "confidence": <number between 0 and 1, indicating confidence that a real road defect exists>
}

Classification Rules:
1. NON-ROAD SUBJECT (e.g. computer/laptop screen, indoor room, desk, vehicle interior, animal, person, document):
   - Set severity: "LOW"
   - Set confidence: 0.05
   - Set surface_type: null
   - Set size_estimate_cm: null
   - Set description_hinglish: "Yeh tasveer kisi sadak ya khadde ki nahi hai (jaise screen, laptop ya kamra). Kripya vastavik sadak defect ki photo upload karein."
2. UNDAMAGED ROAD:
   - Set severity: "LOW"
   - Set confidence: 0.1
   - Set size_estimate_cm: null
   - Set description_hinglish: "Sadak par koi visible defect ya khadda nahi dikh raha hai. Surface intact lagti hai."
3. REAL ROAD DAMAGE / POTHOLE:
   - HIGH: Deep or wide crater, jagged asphalt break, severe hazard to two-wheelers and traffic.
   - MEDIUM: Developing cavity or significant crack requiring municipal patching.
   - LOW: Minor surface wear or aggregate raveling.
   - Set confidence between 0.70 and 0.99 based on visual clarity.`;

export interface GeminiOutcome<T> {
  result: T | null;
  status: AIStatus;
  raw?: string;
}

export async function analyzePotholePhoto(
  buffer: Buffer,
  mimeType: string,
  gpsHint?: string
): Promise<GeminiOutcome<GeminiPotholeResult>> {
  const genAI = getClient();
  if (!genAI) {
    return { result: null, status: 'MANUAL_REVIEW' };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = gpsHint
      ? `${POTHOLE_PROMPT}\nGPS context: ${gpsHint}`
      : POTHOLE_PROMPT;
    const res = await generateWithRetry(model, [prompt, bufferToPart(buffer, mimeType)]);
    const text = res.response.text();
    const parsed = extractJson<GeminiPotholeResult>(text);

    if (!parsed || !parsed.severity) {
      return { result: null, status: 'MANUAL_REVIEW', raw: text };
    }

    return {
      result: {
        severity: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.severity) ? parsed.severity : 'MEDIUM',
        size_estimate_cm:
          typeof parsed.size_estimate_cm === 'number' ? parsed.size_estimate_cm : null,
        surface_type: parsed.surface_type || null,
        description_hinglish: parsed.description_hinglish || '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      },
      status: parsed.confidence >= 0.5 ? 'PASS' : 'MANUAL_REVIEW',
      raw: text,
    };
  } catch (err) {
    console.error('Gemini pothole analysis failed:', err);
    return { result: null, status: 'ERROR' };
  }
}

export interface GeminiInvoiceResult {
  document_type: 'invoice' | 'receipt' | 'bill' | 'photograph' | 'other';
  vendor: string | null;
  amount_inr: number | null;
  date: string | null;
  invoice_number: string | null;
  line_items_summary: string | null;
  confidence: number;
}

const INVOICE_PROMPT = `You are a document-vision auditor for a nonprofit fund-release platform.
Read the provided document image (an invoice, receipt, or bill for goods or work done) and extract structured data.
Respond with ONLY a JSON object, no markdown:
{
  "document_type": "invoice" | "receipt" | "bill" | "photograph" | "other",
  "vendor": <string|null — the business or contractor that issued the document>,
  "amount_inr": <number|null — the printed GRAND TOTAL payable in Indian rupees, digits only>,
  "date": <"YYYY-MM-DD"|null — the document issue date>,
  "invoice_number": <string|null — the invoice/receipt number as printed>,
  "line_items_summary": <short string|null — what was billed for>,
  "confidence": <number between 0 and 1 — how sure you are of vendor + amount>
}
Rules: read the grand total, never a subtotal or tax line alone. If the total is ambiguous, set amount_inr null and lower confidence.
If the document is a site photograph with no monetary amounts, set document_type "photograph" and all financial fields null.`;

export async function extractDocumentData(
  buffer: Buffer,
  mimeType: string
): Promise<GeminiOutcome<GeminiInvoiceResult>> {
  const genAI = getClient();
  if (!genAI) {
    return { result: null, status: 'MANUAL_REVIEW' };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const res = await generateWithRetry(model, [INVOICE_PROMPT, bufferToPart(buffer, mimeType)]);
    const text = res.response.text();
    const parsed = extractJson<GeminiInvoiceResult>(text);

    if (!parsed || !parsed.document_type) {
      return { result: null, status: 'MANUAL_REVIEW', raw: text };
    }

    return {
      result: {
        document_type: ['invoice', 'receipt', 'bill', 'photograph', 'other'].includes(parsed.document_type)
          ? parsed.document_type
          : 'other',
        vendor: parsed.vendor || null,
        amount_inr: typeof parsed.amount_inr === 'number' ? parsed.amount_inr : null,
        date: typeof parsed.date === 'string' ? parsed.date : null,
        invoice_number: parsed.invoice_number || null,
        line_items_summary: parsed.line_items_summary || null,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      },
      status: 'PASS',
      raw: text,
    };
  } catch (err) {
    console.error('Gemini document extraction failed:', err);
    return { result: null, status: 'ERROR' };
  }
}
const COMPARE_PROMPT = `You are verifying road-repair completion for a milestone escrow.
You are given TWO photos of the same road segment: photo 1 is BEFORE repair (a pothole is marked by a citizen report), photo 2 is AFTER repair.
Respond with ONLY a JSON object, no markdown:
{
  "repaired": <true if the pothole from photo 1 appears properly repaired in photo 2, else false>,
  "confidence": <number between 0 and 1>,
  "notes_hinglish": <2-3 sentences in Hinglish (Roman script) explaining the comparison result>
}
Compare surface texture, fill material, edges, and whether the geometry looks like the same location.`;

export async function compareBeforeAfter(
  beforeBuffer: Buffer,
  beforeMime: string,
  afterBuffer: Buffer,
  afterMime: string
): Promise<GeminiOutcome<GeminiCompareResult>> {
  const genAI = getClient();
  if (!genAI) {
    return { result: null, status: 'MANUAL_REVIEW' };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const res = await generateWithRetry(model, [
      COMPARE_PROMPT,
      'PHOTO 1 (BEFORE):',
      bufferToPart(beforeBuffer, beforeMime),
      'PHOTO 2 (AFTER):',
      bufferToPart(afterBuffer, afterMime),
    ]);
    const text = res.response.text();
    const parsed = extractJson<GeminiCompareResult>(text);

    if (!parsed || typeof parsed.repaired !== 'boolean') {
      return { result: null, status: 'MANUAL_REVIEW', raw: text };
    }

    return {
      result: {
        repaired: parsed.repaired,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        notes_hinglish: parsed.notes_hinglish || '',
      },
      status: parsed.repaired && parsed.confidence >= 0.5 ? 'PASS' : 'FLAG',
      raw: text,
    };
  } catch (err) {
    console.error('Gemini before/after comparison failed:', err);
    return { result: null, status: 'ERROR' };
  }
}
