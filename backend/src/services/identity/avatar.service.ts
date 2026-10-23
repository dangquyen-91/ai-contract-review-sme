import { randomUUID } from 'crypto';
import type { UploadApiResponse } from 'cloudinary';
import { cloudinary, isCloudinaryConfigured } from '../../config/cloudinary';
import { AppError } from '../../errors/AppError';
import { logger } from '../../config/logger';

export function validateAvatar(buffer: Buffer, mime: string) {
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  const webp =
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!(
    (png && mime === 'image/png') ||
    (jpeg && mime === 'image/jpeg') ||
    (webp && mime === 'image/webp')
  )) {
    throw AppError.badRequest('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ.');
  }
}
export async function uploadAvatar(buffer: Buffer, mime: string) {
  validateAvatar(buffer, mime);
  if (!isCloudinaryConfigured) throw new AppError('Dịch vụ lưu ảnh chưa được cấu hình.', 503);
  try {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'lawscan/avatars',
          public_id: randomUUID(),
          resource_type: 'image',
          format: 'webp',
          transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'auto' }],
        },
        (error, uploaded) => {
          if (error || !uploaded) return reject(error ?? new Error('Upload failed'));
          resolve(uploaded);
        },
      );
      stream.end(buffer);
    });
    if (!result.secure_url?.startsWith('https://') || !result.public_id)
      throw new Error('Invalid upload response');
    return { avatarUrl: result.secure_url, avatarPublicId: result.public_id };
  } catch {
    throw new AppError('Không thể tải ảnh đại diện. Vui lòng thử lại.', 502);
  }
}
export async function removeAvatar(publicId?: string | null) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch {
    logger.warn('Could not remove unused avatar');
  }
}
