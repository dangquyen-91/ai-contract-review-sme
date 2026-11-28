/** Address of a LawScan backend API path, for server-side route handlers and proxies. */
export function backendApiUrl(path: string) {
  return `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1${path}`;
}
