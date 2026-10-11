import { UploadApiResponse } from 'cloudinary';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { AppError } from '../errors/AppError';

export const PRIVATE_DELIVERY_TYPE = 'private';

const DOWNLOAD_LINK_TTL_SECONDS = 5 * 60;

export interface StoredFile {
  key: string;
  resourceType: string;
  deliveryType: string;
  format?: string;
}

export interface FileDownloadLink {
  url: string;
  expiresAt: Date;
}

export interface VersionFileFields {
  fileKey?: string | null;
  fileResourceType?: string | null;
  fileDeliveryType?: string | null;
  fileFormat?: string | null;
}

export function storedFileOf(version: VersionFileFields): StoredFile | undefined {
  if (!version.fileKey || !version.fileResourceType) return undefined;
  return {
    key: version.fileKey,
    resourceType: version.fileResourceType,
    deliveryType: version.fileDeliveryType ?? PRIVATE_DELIVERY_TYPE,
    format: version.fileFormat ?? undefined,
  };
}

function assertStorageConfigured() {
  if (!isCloudinaryConfigured) {
    throw AppError.internal(
      'File storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
    );
  }
}

function toStoredFile(result: UploadApiResponse): StoredFile {
  return {
    key: result.public_id,
    resourceType: result.resource_type,
    deliveryType: result.type,
    format: result.format || undefined,
  };
}

export async function uploadContractFile(
  buffer: Buffer,
  orgId: string,
  originalName: string,
): Promise<StoredFile> {
  assertStorageConfigured();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `contracts/${orgId}`,
        resource_type: 'raw',
        type: PRIVATE_DELIVERY_TYPE,
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

  return toStoredFile(result);
}

export function createFileDownloadLink(file: StoredFile): FileDownloadLink {
  assertStorageConfigured();
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_TTL_SECONDS;
  const url = cloudinary.utils.private_download_url(file.key, file.format ?? '', {
    resource_type: file.resourceType,
    type: file.deliveryType,
    expires_at: expiresAtSeconds,
  });
  return { url, expiresAt: new Date(expiresAtSeconds * 1000) };
}

export async function downloadContractFile(file: StoredFile): Promise<Buffer> {
  const response = await fetch(createFileDownloadLink(file).url);
  if (!response.ok) {
    throw new Error(`Could not download contract file "${file.key}" (HTTP ${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteContractFile(file: StoredFile): Promise<void> {
  if (!isCloudinaryConfigured) return;
  await cloudinary.uploader.destroy(file.key, {
    resource_type: file.resourceType,
    type: file.deliveryType,
  });
}
