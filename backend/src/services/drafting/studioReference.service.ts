import multer from 'multer';
import type { RequestHandler } from 'express';
import { validateDocxArchive } from '../../utils/uploadContent';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { AppError } from '../../errors/AppError';

const maxBytes = 2 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1, fields: 0 },
}).single('file');
export const uploadStudioReference: RequestHandler = (req, res, next) =>
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError)
      return next(
        AppError.badRequest('Chỉ đính kèm một tệp PDF, Word hoặc TXT, tối đa 2 MB mỗi lần.'),
      );
    next(error);
  });

export async function readStudioReference(file?: Express.Multer.File) {
  if (!file || file.buffer.length > maxBytes)
    throw AppError.badRequest('Vui lòng chọn tệp tham khảo tối đa 2 MB.');
  const name = [...file.originalname]
    .filter((character) => character.charCodeAt(0) >= 32 && !['/', '\\'].includes(character))
    .join('')
    .slice(0, 150);
  let text = '';
  try {
    if (/\.pdf$/i.test(name) && file.buffer.subarray(0, 5).toString() === '%PDF-') {
      const result = await pdf(file.buffer, { max: 20 });
      if (result.numpages > 20)
        throw AppError.badRequest(
          'Tài liệu tham khảo tối đa 20 trang. Vui lòng chọn phần cần dùng.',
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
  if (text.length > 12000)
    throw AppError.badRequest(
      'Tài liệu tham khảo tối đa 12.000 ký tự. Vui lòng tách phần cần dùng.',
    );
  return { name, text };
}
