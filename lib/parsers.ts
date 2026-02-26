// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import JSZip from 'jszip';

export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return extractPdfText(buffer);
    case 'docx':
      return extractDocxText(buffer);
    case 'pptx':
      return extractPptxText(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
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

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const texts: string[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  for (const fileName of slideFiles) {
    const xml = await zip.files[fileName].async('text');
    // Extract text from XML tags <a:t>...</a:t>
    const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
    if (matches) {
      const slideTexts = matches.map((m) => m.replace(/<\/?a:t>/g, ''));
      texts.push(slideTexts.join(' '));
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
