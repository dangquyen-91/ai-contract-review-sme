const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');
const envPath = path.join(backendRoot, '.env');
const fileEnv = existsSync(envPath) ? dotenv.parse(readFileSync(envPath)) : {};
const defaultBinary = process.platform === 'win32'
  ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
  : 'soffice';
const binary = (process.env.LIBREOFFICE_PATH ?? fileEnv.LIBREOFFICE_PATH ?? defaultBinary).trim();
const installWindows = process.argv.includes('--install-windows');

function version() {
  if (!binary) return null;
  const base = path.resolve(tmpdir());
  const profile = mkdtempSync(path.join(base, 'lawscan-office-check-'));
  try {
    // The Windows console launcher exposes --version on stdout; soffice.exe is GUI-oriented.
    const consoleBinary = binary.replace(/soffice\.exe$/i, 'soffice.com');
    const executable = process.platform === 'win32' && existsSync(binary) && existsSync(consoleBinary)
      ? consoleBinary
      : binary;
    const output = execFileSync(executable, [
      `-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--version',
    ], {
      encoding: 'utf8', timeout: 15000, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return /^LibreOffice\s/i.test(output) ? output : null;
  } catch {
    return null;
  } finally {
    if (path.dirname(profile) === base && path.basename(profile).startsWith('lawscan-office-check-')) {
      rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  }
}

function main() {
  let installedVersion = version();
  if (!installedVersion && installWindows && !existsSync(binary)) {
    if (process.platform !== 'win32') {
      throw new Error('Lệnh setup:word:windows chỉ dùng trên Windows. Dockerfile của backend đã cài LibreOffice.');
    }
    console.log('Đang cài LibreOffice qua WinGet. Windows có thể yêu cầu quyền quản trị.');
    try {
      execFileSync('winget.exe', [
        'install', '--id', 'TheDocumentFoundation.LibreOffice', '--exact', '--source', 'winget',
        '--accept-package-agreements', '--accept-source-agreements',
      ], { stdio: 'inherit', windowsHide: true });
    } catch {
      // WinGet may return a nonzero exit code when the package is already installed.
      // Verify the executable rather than treating the installer result as proof.
    }
    installedVersion = version();
  }
  if (!installedVersion) {
    console.error('Chưa chạy được LibreOffice tại đường dẫn cấu hình.');
    console.error('Kiểm tra LIBREOFFICE_PATH trong backend/.env hoặc biến môi trường của backend/worker.');
    console.error('Windows: npm run setup:word:windows');
    console.error('Nếu máy chưa có WinGet, cài LibreOffice tại https://www.libreoffice.org/download/download-libreoffice/');
    console.error('Nếu đã cài ở thư mục khác, đặt LIBREOFFICE_PATH đến soffice.exe rồi chạy lại npm run check:word.');
    console.error('Linux/server: dùng image được build từ backend/Dockerfile hoặc cài LibreOffice trên máy chạy worker.');
    process.exitCode = 1;
    return;
  }
  console.log(`Đã tìm thấy ${installedVersion}`);
  console.log('Hãy khởi động lại backend/worker sau khi cài hoặc đổi cấu hình, rồi tải lại tệp Word.');
  console.log('Kiểm tra này xác nhận chạy được LibreOffice; chưa kiểm tra chuyển đổi một tệp DOCX cụ thể.');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
