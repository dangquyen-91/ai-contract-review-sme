import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { AppError } from '../../errors/AppError';
import { validateDocxArchive } from '../../utils/uploadContent';

/** Reads the text of an uploaded PDF, Word .docx or UTF-8 TXT file. */
export async function readUploadText(file: Express.Multer.File, maxPages: number) {
  const name = [...file.originalname]
    .filter((character) => character.charCodeAt(0) >= 32 && !['/', '\\'].includes(character))
    .join('')
    .slice(0, 150);
  let text = '';
  try {
    if (/\.pdf$/i.test(name) && file.buffer.subarray(0, 5).toString() === '%PDF-') {
      const result = await pdf(file.buffer, { max: maxPages });
      if (result.numpages > maxPages)
        throw AppError.badRequest(
          `Tài liệu tối đa ${maxPages} trang. Vui lòng chọn phần cần dùng.`,
        );
      text = result.text;
    } else if (/\.docx$/i.test(name) && file.buffer.subarray(0, 2).toString() === 'PK') {
      await validateDocxArchive(file.buffer, 10 * 1024 * 1024, 500);
      text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
    } else if (/\.txt$/i.test(name)) {
      text = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
    } else throw AppError.badRequest('Chỉ hỗ trợ tệp PDF có chữ, Word .docx hoặc TXT UTF-8.');
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.badRequest(
      'Không đọc được tài liệu. Hãy thử PDF có chữ, Word .docx hoặc TXT UTF-8.',
    );
  }
  text = text.replaceAll(String.fromCharCode(0), '').trim();
  if (!text)
    throw AppError.badRequest(
      'Tệp chưa có nội dung chữ đọc được. PDF dạng ảnh cần chuyển thành văn bản trước.',
    );
  return { name, text };
}
