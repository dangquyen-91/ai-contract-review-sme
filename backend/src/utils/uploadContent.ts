import JSZip from 'jszip';
import { Readable } from 'stream';
import { AppError } from '../errors/AppError';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const DOCX_MAX_EXPANDED_BYTES = 50 * 1024 * 1024;
const invalid = () => AppError.badRequest('Nội dung tệp không khớp định dạng hoặc tệp đã hỏng.');
const tooLarge = () => AppError.badRequest('Tệp Word quá lớn hoặc có quá nhiều thành phần sau giải nén. Vui lòng rút gọn tài liệu.');

export async function validateDocxArchive(
  buffer: Buffer,
  maxExpandedBytes = DOCX_MAX_EXPANDED_BYTES,
  maxEntries = 2000,
) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const entries = Object.values(zip.files).filter((entry) => !entry.dir);
    if (!zip.file('word/document.xml') || !zip.file('[Content_Types].xml')) throw invalid();
    if (entries.length > maxEntries) throw tooLarge();
    // Metadata is only an early rejection. Count actual streamed bytes as well.
    let expanded = 0;
    const advertised = entries.reduce(
      (sum, entry) =>
        sum +
        ((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ??
          0),
      0,
    );
    if (advertised > maxExpandedBytes) throw tooLarge();
    for (const entry of entries) {
      await new Promise<void>((resolve, reject) => {
        const stream = entry.nodeStream('nodebuffer') as Readable;
        stream.on('data', (chunk: Buffer) => {
          expanded += chunk.length;
          if (expanded > maxExpandedBytes) {
            stream.destroy();
            reject(tooLarge());
          }
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalid();
  }
}

export async function validateUploadContent(buffer: Buffer, mime: string) {
  if (!buffer.length) throw AppError.badRequest('Tệp không có nội dung.');
  if (mime === DOCX) return validateDocxArchive(buffer);
  if (mime === 'application/pdf' && buffer.subarray(0, 5).toString() === '%PDF-') return;
  if (
    mime === 'image/png' &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return;
  if (
    mime === 'image/jpeg' &&
    buffer.length >= 3 &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  )
    return;
  if (
    mime === 'application/msword' &&
    buffer.subarray(0, 8).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]))
  )
    return;
  if (mime === 'text/plain') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (text.includes('\u0000')) throw invalid();
      return;
    } catch {
      throw invalid();
    }
  }
  throw invalid();
}
