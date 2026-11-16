export function normalizeUploadFileName(name: string): string {
  // Multipart headers are decoded as Latin-1 by the parser, while browsers send
  // UTF-8 names. Decode only when all original bytes form valid UTF-8.
  if ([...name].every((character) => character.codePointAt(0)! <= 255)) {
    try {
      return new TextDecoder('utf-8', { fatal: true })
        .decode(Buffer.from(name, 'latin1'))
        .normalize('NFC');
    } catch {
      // Preserve filenames which were already decoded correctly.
    }
  }
  return name.normalize('NFC');
}
