/**
 * PDR-4.3 §13-§22: OCR Text Normalization Engine
 * Handles currency extraction, number extraction, date extraction,
 * structured text blocks, bounding boxes, multi-language support.
 * 
 * OCR provider output must not be the sole trusted source.
 * Mission policy decides whether extracted text satisfies the task.
 */

export type OCRBlock = {
  text: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  language?: string;
};

export type OCRObservation = {
  text: string;
  blocks: OCRBlock[];
  language?: string;
  documentDetected: boolean;
  quality: {
    readable: boolean;
    blur: boolean;
    perspective: boolean;
  };
  extractedFacts: ExtractedFacts;
};

export type ExtractedFacts = {
  currencies: CurrencyFact[];
  numbers: NumberFact[];
  dates: DateFact[];
  words: number;
  lines: number;
  paragraphs: number;
  hasSignature: boolean;
  hasTable: boolean;
  detectedFields: Record<string, string>;
};

export type CurrencyFact = {
  raw: string;
  normalized: string;
  amount: number;
  currency: string;
  confidence: number;
};

export type NumberFact = {
  raw: string;
  normalized: string;
  value: number;
  context: string;
  confidence: number;
};

export type DateFact = {
  raw: string;
  normalized: string;
  parsed: Date | null;
  confidence: number;
};

// ─── Currency Patterns ────────────────────────────────

const CURRENCY_PATTERNS: Array<{
  pattern: RegExp;
  currency: string;
  extract: (match: RegExpMatchArray) => number;
}> = [
  { pattern: /(?:Rs\.?|NPR|रु)\s*([0-9,]+(?:\.\d{1,2})?)/gi, currency: "NPR", extract: (m) => parseNumericString(m[1]) },
  { pattern: /\$\s*([0-9,]+(?:\.\d{1,2})?)/g, currency: "USD", extract: (m) => parseNumericString(m[1]) },
  { pattern: /€\s*([0-9,]+(?:\.\d{1,2})?)/g, currency: "EUR", extract: (m) => parseNumericString(m[1]) },
  { pattern: /£\s*([0-9,]+(?:\.\d{1,2})?)/g, currency: "GBP", extract: (m) => parseNumericString(m[1]) },
  { pattern: /₹\s*([0-9,]+(?:\.\d{1,2})?)/g, currency: "INR", extract: (m) => parseNumericString(m[1]) },
  { pattern: /¥\s*([0-9,]+(?:\.\d{1,2})?)/g, currency: "JPY", extract: (m) => parseNumericString(m[1]) },
];

// ─── Number Patterns ──────────────────────────────────

const NUMBER_PATTERNS: Array<{
  pattern: RegExp;
  context: string;
}> = [
  { pattern: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:total|amount|sum|price|cost)/gi, context: "total" },
  { pattern: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:pages?|words?|items?|books?|reps?)/gi, context: "count" },
  { pattern: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*%/g, context: "percentage" },
  { pattern: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?)/gi, context: "duration" },
  { pattern: /(\d+)\s*(?:\/|of)\s*(\d+)/g, context: "fraction" },
];

// ─── Date Patterns ────────────────────────────────────

const DATE_PATTERNS: Array<{
  pattern: RegExp;
  parse: (match: RegExpMatchArray) => Date | null;
}> = [
  { pattern: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g, parse: (m) => {
    const [_, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(mo) - 1, parseInt(d));
  }},
  { pattern: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g, parse: (m) => {
    return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  }},
  { pattern: /(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/gi, parse: (m) => {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const monthStr = m[2].toLowerCase().slice(0, 3);
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return new Date(year, months[monthStr] ?? 0, parseInt(m[1]));
  }},
  { pattern: /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{2,4})/gi, parse: (m) => {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const monthStr = m[1].toLowerCase().slice(0, 3);
    const year = m[2].length === 2 ? 2000 + parseInt(m[2]) : parseInt(m[2]);
    return new Date(year, months[monthStr] ?? 0, parseInt(m[1]));
  }},
];

// ─── Helpers ──────────────────────────────────────────

function parseNumericString(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

// ─── Main Normalizer ──────────────────────────────────

export function normalizeOCRText(text: string): OCRObservation {
  const blocks = extractBlocks(text);
  const extractedFacts = extractFacts(text);

  const lines = text.split(/\n/).filter((l) => l.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const hasSignature = /(?:sign|signature|signed)/i.test(text) ||
    /[a-z]\s*\.{3,}/i.test(text) ||
    /\|{2,}/i.test(text);

  const hasTable = /\t/.test(text) ||
    (lines.length > 2 && lines.every((l) => (l.match(/\|/g) || []).length >= 2));

  return {
    text,
    blocks,
    documentDetected: hasTable || hasSignature || extractedFacts.currencies.length > 0,
    quality: assessOCRQuality(text, blocks),
    extractedFacts: {
      ...extractedFacts,
      words: text.split(/\s+/).filter((w) => w.length > 0).length,
      lines: lines.length,
      paragraphs: paragraphs.length,
      hasSignature,
      hasTable,
    },
  };
}

function extractBlocks(text: string): OCRBlock[] {
  const lines = text.split(/\n/);
  const blocks: OCRBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    blocks.push({
      text: line,
      boundingBox: {
        x: 0,
        y: i * 20,
        width: line.length * 8,
        height: 20,
      },
      confidence: Math.min(1, line.length / 10),
    });
  }

  return blocks;
}

function extractFacts(text: string): Omit<ExtractedFacts, "words" | "lines" | "paragraphs" | "hasSignature" | "hasTable"> {
  const currencies: CurrencyFact[] = [];
  const numbers: NumberFact[] = [];
  const dates: DateFact[] = [];
  const detectedFields: Record<string, string> = {};

  // Extract currencies
  for (const { pattern, currency, extract } of CURRENCY_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const amount = extract(match);
      if (amount > 0 && amount < 10_000_000) {
        currencies.push({
          raw: match[0],
          normalized: `${currency} ${amount.toLocaleString()}`,
          amount,
          currency,
          confidence: 0.8,
        });
      }
    }
  }

  // Extract numbers with context
  for (const { pattern, context } of NUMBER_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const value = parseNumericString(match[1]);
      if (value > 0 && value < 10_000_000) {
        numbers.push({
          raw: match[0],
          normalized: value.toLocaleString(),
          value,
          context,
          confidence: 0.7,
        });
      }
    }
  }

  // Extract dates
  for (const { pattern, parse } of DATE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const parsed = parse(match);
      if (parsed && !isNaN(parsed.getTime())) {
        dates.push({
          raw: match[0],
          normalized: parsed.toISOString().split("T")[0],
          parsed,
          confidence: 0.75,
        });
      }
    }
  }

  // Detect key-value fields
  const fieldPatterns = [
    { key: "total", pattern: /(?:total|amount|sum)[:\s]*([^\n]+)/i },
    { key: "date", pattern: /(?:date|dated)[:\s]*([^\n]+)/i },
    { key: "name", pattern: /(?:name|customer|client)[:\s]*([^\n]+)/i },
    { key: "address", pattern: /(?:address|addr)[:\s]*([^\n]+)/i },
    { key: "phone", pattern: /(?:phone|tel|mobile)[:\s]*([^\n]+)/i },
    { key: "email", pattern: /(?:email|e-mail)[:\s]*([^\n]+)/i },
    { key: "invoice", pattern: /(?:invoice|receipt|bill)\s*(?:#|no|number)?[:\s]*([^\n]+)/i },
  ];

  for (const { key, pattern } of fieldPatterns) {
    const match = text.match(pattern);
    if (match) {
      detectedFields[key] = match[1].trim();
    }
  }

  return { currencies, numbers, dates, detectedFields };
}

function assessOCRQuality(
  text: string,
  blocks: OCRBlock[]
): OCRObservation["quality"] {
  const avgConfidence = blocks.length > 0
    ? blocks.reduce((sum, b) => sum + b.confidence, 0) / blocks.length
    : 0;

  const hasGarbledText = /[^\w\s\d.,;:!?'"()\[\]{}\/\\@#$%&*+=<>|~`\n\r\-]/g.test(text);
  const lowConfBlocks = blocks.filter((b) => b.confidence < 0.3).length;
  const lowConfRatio = blocks.length > 0 ? lowConfBlocks / blocks.length : 0;

  return {
    readable: avgConfidence > 0.4 && lowConfRatio < 0.5 && !hasGarbledText,
    blur: lowConfRatio > 0.6,
    perspective: blocks.length > 0 && blocks.every((b) => b.boundingBox.width > 0),
  };
}

// ─── Mission-Specific Extractors ──────────────────────

export function extractReceiptTotal(text: string): CurrencyFact | null {
  const facts = normalizeOCRText(text);
  if (facts.extractedFacts.currencies.length > 0) {
    return facts.extractedFacts.currencies.reduce((max, c) =>
      c.amount > max.amount ? c : max
    );
  }
  return null;
}

export function extractWordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export function extractNumberFromText(text: string, context?: string): number | null {
  const facts = normalizeOCRText(text);
  const matching = context
    ? facts.extractedFacts.numbers.filter((n) => n.context === context)
    : facts.extractedFacts.numbers;

  if (matching.length > 0) {
    return matching.reduce((max, n) => n.value > max.value ? n : max).value;
  }
  return null;
}

export function extractDateFromText(text: string): DateFact | null {
  const facts = normalizeOCRText(text);
  return facts.extractedFacts.dates.length > 0
    ? facts.extractedFacts.dates[0]
    : null;
}
