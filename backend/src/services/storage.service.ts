import { UploadApiResponse } from 'cloudinary';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { AppError } from '../errors/AppError';

export interface UploadedFile {
  key: string; // Cloudinary public_id, used later to delete the asset
  url: string; // secure_url, safe to serve directly to the client
  resourceType: string; // 'image' | 'raw' | 'video', needed to delete the asset later
}

export async function uploadContractFile(
  buffer: Buffer,
  orgId: string,
  originalName: string,
): Promise<UploadedFile> {
  if (!isCloudinaryConfigured) {
    throw AppError.internal(
      'File storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
    );
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `contracts/${orgId}`,
        resource_type: 'auto',
        filename_override: originalName,
        use_filename: true,
        unique_filename: true,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) return reject(error);
        resolve(uploadResult);
      },
    );
    stream.end(buffer);
  });

  return { key: result.public_id, url: result.secure_url, resourceType: result.resource_type };
}

export async function deleteContractFile(publicId: string, resourceType: string): Promise<void> {
  if (!isCloudinaryConfigured) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
