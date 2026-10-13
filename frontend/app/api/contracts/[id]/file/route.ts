import { NextRequest, NextResponse } from "next/server";

type ContractFilePayload = {
  data?: { url?: string; fileName?: string; mimeType?: string };
};

function isStorageUrl(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  if (url.hostname === "api.cloudinary.com") {
    return /^\/v1_1\/[a-zA-Z0-9_-]+\/(?:image|raw|video)\/download$/.test(url.pathname);
  }
  return url.hostname === "res.cloudinary.com" &&
    /^\/[a-zA-Z0-9_-]+\/(?:image|raw|video)\/(?:upload|private|authenticated)\//.test(url.pathname);
}

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/file">) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });

  const { id } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Mã hợp đồng không hợp lệ." }, { status: 400 });
  }

  try {
    const metadataResponse = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts/${id}/file`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    if (!metadataResponse.ok) {
      const error = metadataResponse.status === 404 ? "Hợp đồng không có file gốc." : "Không thể mở file hợp đồng.";
      return NextResponse.json({ error }, { status: metadataResponse.status });
    }

    const { data }: ContractFilePayload = await metadataResponse.json();
    if (!data?.url || !data.mimeType) {
      return NextResponse.json({ error: "Không thể lấy thông tin file gốc." }, { status: 502 });
    }
    let fileUrl = new URL(data.url);
    let fileResponse: Response | undefined;
    // Cloudinary private download links can redirect to its delivery domain.
    // Validate each destination and never forward the user's access token.
    for (let redirects = 0; redirects <= 3; redirects++) {
      if (!isStorageUrl(fileUrl)) {
        return NextResponse.json({ error: "Đường dẫn file không hợp lệ." }, { status: 502 });
      }
      fileResponse = await fetch(fileUrl, { cache: "no-store", redirect: "manual", signal: request.signal });
      if (![301, 302, 303, 307, 308].includes(fileResponse.status)) break;
      const location = fileResponse.headers.get("location");
      await fileResponse.body?.cancel();
      if (!location || redirects === 3) {
        return NextResponse.json({ error: "Không thể tải file gốc." }, { status: 502 });
      }
      fileUrl = new URL(location, fileUrl);
    }
    if (!fileResponse?.ok || !fileResponse.body) {
      return NextResponse.json({ error: "Không thể tải file gốc." }, { status: 502 });
    }
    const fileName = (data.fileName ?? "contract").replace(/[\r\n"\\]/g, "_");
    return new Response(fileResponse.body, {
      headers: {
        "Content-Type": data.mimeType,
        "Content-Disposition": `inline; filename="contract"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Không thể tải file gốc." }, { status: 503 });
  }
}
