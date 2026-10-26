import { execFile } from 'child_process';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';

export async function countDocxPages(buffer: Buffer): Promise<number> {
  const base = path.resolve(tmpdir());
  const directory = await mkdtemp(path.join(base, 'lawscan-docx-'));
  try {
    const profile = path.join(directory, 'profile');
    await mkdir(path.join(profile, 'user'), { recursive: true });
    await writeFile(path.join(profile, 'user', 'registrymodifications.xcu'), '<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>');
    const input = path.join(directory, 'contract.docx');
    await writeFile(input, buffer);
    await new Promise<void>((resolve, reject) => execFile(env.LIBREOFFICE_PATH, [
      `-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--nologo', '--nodefault', '--norestore',
      '--convert-to', 'pdf:writer_pdf_Export', '--outdir', directory, input,
    ], { timeout: 60_000, windowsHide: true, maxBuffer: 1024 * 1024 }, error => error ? reject(error) : resolve()));
    const pdf = await readFile(path.join(directory, 'contract.pdf'));
    const mupdf = await import('mupdf');
    const document = mupdf.Document.openDocument(pdf, 'application/pdf');
    try {
      const pages = document.countPages();
      if (!Number.isSafeInteger(pages) || pages < 1) throw new Error('Invalid page count');
      return pages;
    } finally { document.destroy(); }
  } catch {
    throw new AppError('Chưa đếm được số trang Word. Máy chủ cần LibreOffice; bạn có thể tải lên bản PDF. Chưa trừ lượt.', 503, true, 'REVIEW_PAGE_COUNT_UNAVAILABLE');
  } finally {
    // Only remove the private directory created by mkdtemp inside the resolved temporary root.
    if (path.dirname(path.resolve(directory)) === base && path.basename(directory).startsWith('lawscan-docx-')) await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}
