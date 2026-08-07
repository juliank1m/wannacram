// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import JSZip from 'jszip';

// A single document never needs to be longer than the whole LLM context budget.
// Capping here means no caller can store an unbounded blob in extracted_text.
export const MAX_EXTRACTED_CHARS = 150_000;

export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  let text: string;
  switch (fileType) {
    case 'pdf':
      text = await extractPdfText(buffer);
      break;
    case 'docx':
      text = await extractDocxText(buffer);
      break;
    case 'pptx':
      text = await extractPptxText(buffer);
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  return text.length > MAX_EXTRACTED_CHARS ? text.slice(0, MAX_EXTRACTED_CHARS) : text;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  if (!data.text || data.text.trim().length === 0) {
    throw new Error(
      'Could not extract text from this PDF. It may be a scanned document without a text layer.'
    );
  }
  return data.text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  if (!result.value || result.value.trim().length === 0) {
    throw new Error('Could not extract text from this DOCX file.');
  }
  return result.value;
}

// Ceiling on decompressed slide XML. A small .pptx can inflate to gigabytes
// (zip bomb), and JSZip decompresses into memory with no budget of its own.
const MAX_PPTX_INFLATED_BYTES = 100 * 1024 * 1024;

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const texts: string[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  let inflated = 0;
  let extractedChars = 0;

  for (const fileName of slideFiles) {
    const xml = await zip.files[fileName].async('text');
    inflated += xml.length;
    if (inflated > MAX_PPTX_INFLATED_BYTES) {
      throw new Error('This PPTX file is too large to process.');
    }

    // Extract text from XML tags <a:t>...</a:t>
    const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
    if (matches) {
      const slideTexts = matches.map((m) => m.replace(/<\/?a:t>/g, ''));
      texts.push(slideTexts.join(' '));
      extractedChars += slideTexts.reduce((n, s) => n + s.length, 0);
      if (extractedChars >= MAX_EXTRACTED_CHARS) break;
    }
  }

  if (texts.length === 0) {
    throw new Error('Could not extract text from this PPTX file.');
  }

  return texts.join('\n\n');
}

export function getFileType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && ['pdf', 'docx', 'pptx'].includes(ext)) {
    return ext;
  }
  return null;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}
