import { AppError } from '../../errors/AppError';
import { STUDIO_REFERENCE_MAX_BYTES } from '../../config/studioReference';
import { readUploadText } from './uploadText.service';

export async function readStudioReference(file?: Express.Multer.File) {
  if (!file || file.buffer.length > STUDIO_REFERENCE_MAX_BYTES)
    throw AppError.badRequest('Vui lòng chọn tệp tham khảo tối đa 2 MB.');
  const { name, text } = await readUploadText(file, 20);
  if (text.length > 12000)
    throw AppError.badRequest(
      'Tài liệu tham khảo tối đa 12.000 ký tự. Vui lòng tách phần cần dùng.',
    );
  return { name, text };
}
