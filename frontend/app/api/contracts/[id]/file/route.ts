import { NextRequest, NextResponse } from "next/server";

type ContractTextPayload = {
  data?: { fileUrl?: string; fileName?: string; mimeType?: string };
};

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/file">) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });

  const { id } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Mã hợp đồng không hợp lệ." }, { status: 400 });
  }

  try {
    const metadataResponse = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts/${id}/text`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    if (!metadataResponse.ok) {
      return NextResponse.json({ error: "Không thể mở file hợp đồng." }, { status: metadataResponse.status });
    }

    const { data }: ContractTextPayload = await metadataResponse.json();
    if (!data?.fileUrl || !data.mimeType) {
      return NextResponse.json({ error: "Hợp đồng không có file gốc." }, { status: 404 });
    }
    const fileUrl = new URL(data.fileUrl);
    if (fileUrl.protocol !== "https:" || fileUrl.hostname !== "res.cloudinary.com" ||
      !/^\/[a-zA-Z0-9_-]+\/(?:image|raw|video)\/upload\//.test(fileUrl.pathname)) {
      return NextResponse.json({ error: "Đường dẫn file không hợp lệ." }, { status: 502 });
    }

    const fileResponse = await fetch(fileUrl, { cache: "no-store", redirect: "error" });
    if (!fileResponse.ok || !fileResponse.body) {
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
