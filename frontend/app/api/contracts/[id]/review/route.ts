import { NextRequest, NextResponse } from "next/server";

type UpstreamPayload = {
  data?: unknown;
  error?: { message?: string };
  success?: boolean;
};

async function readPayload(response: Response): Promise<UpstreamPayload> {
  return response.json().catch(() => ({
    success: false,
    error: { message: "Máy chủ trả về dữ liệu không hợp lệ." },
  }));
}

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/review">) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { message: "Phiên đăng nhập đã hết hạn." } },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json(
      { success: false, error: { message: "Mã hợp đồng không hợp lệ." } },
      { status: 400 },
    );
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const body = await request.json().catch(() => ({}));

  try {
    const segmentResponse = await fetch(`${apiBaseUrl}/api/v1/contracts/${id}/clauses/segment`, {
      method: "POST",
      headers,
      cache: "no-store",
    });
    const segmentPayload = await readPayload(segmentResponse);
    if (!segmentResponse.ok) return NextResponse.json(segmentPayload, { status: segmentResponse.status });

    const [summaryResponse, risksResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/v1/contracts/${id}/summary`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      }),
      fetch(`${apiBaseUrl}/api/v1/contracts/${id}/risks/detect`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      }),
    ]);
    const [summaryPayload, risksPayload] = await Promise.all([
      readPayload(summaryResponse),
      readPayload(risksResponse),
    ]);
    if (!summaryResponse.ok) return NextResponse.json(summaryPayload, { status: summaryResponse.status });
    if (!risksResponse.ok) return NextResponse.json(risksPayload, { status: risksResponse.status });

    const textResponse = await fetch(`${apiBaseUrl}/api/v1/contracts/${id}/text`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const textPayload = await readPayload(textResponse);
    if (!textResponse.ok) return NextResponse.json(textPayload, { status: textResponse.status });
    const extractedText = (textPayload.data as { text?: unknown } | undefined)?.text;

    return NextResponse.json({
      success: true,
      data: {
        contract: summaryPayload.data,
        findings: risksPayload.data,
        clauses: segmentPayload.data,
        extractedText: typeof extractedText === "string" ? extractedText : "",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "AI chưa thể hoàn tất rà soát. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}
