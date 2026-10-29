import { normalizeUploadFileName } from '../../utils/uploadFileName';

// Old uploads may contain UTF-8 filenames decoded as Latin-1. Repair response
// labels without rewriting stored documents or touching the uploaded file.
export function contractDisplayNames<T extends { title: string; currentVersion?: { fileName?: string | null } | null }>(contract: T): T {
  return {
    ...contract,
    title: normalizeUploadFileName(contract.title),
    ...(contract.currentVersion && {
      currentVersion: {
        ...contract.currentVersion,
        fileName: contract.currentVersion.fileName
          ? normalizeUploadFileName(contract.currentVersion.fileName)
          : contract.currentVersion.fileName,
      },
    }),
  };
}
