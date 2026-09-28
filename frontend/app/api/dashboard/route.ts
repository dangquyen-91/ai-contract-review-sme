import { NextRequest, NextResponse } from "next/server";

type AccessClaims = {
  orgId?: string;
  role?: string;
};

function readAccessClaims(token: string): AccessClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AccessClaims;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { message: "Phiên đăng nhập đã hết hạn." } },
      { status: 401 },
    );
  }

  const claims = readAccessClaims(accessToken);
  if (!claims?.orgId) {
    return NextResponse.json(
      { success: false, error: { message: "Bạn cần thiết lập tổ chức trước khi mở dashboard." } },
      { status: 403 },
    );
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    const [organizationResponse, contractsResponse, processingResponse, reviewedResponse, highRiskResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/v1/organizations/${claims.orgId}`, { headers, cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/v1/contracts?limit=10&sortBy=updatedAt&sortOrder=desc`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${apiBaseUrl}/api/v1/contracts?limit=1&status=processing`, { headers, cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/v1/contracts?limit=1&status=reviewed`, { headers, cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/v1/contracts?limit=1&riskLevel=high`, { headers, cache: "no-store" }),
    ]);

    const [organizationPayload, contractsPayload, processingPayload, reviewedPayload, highRiskPayload] = await Promise.all([
      organizationResponse.json(),
      contractsResponse.json(),
      processingResponse.json(),
      reviewedResponse.json(),
      highRiskResponse.json(),
    ]);

    if (!organizationResponse.ok) {
      return NextResponse.json(organizationPayload, { status: organizationResponse.status });
    }
    if (!contractsResponse.ok) {
      return NextResponse.json(contractsPayload, { status: contractsResponse.status });
    }
    const failedMetric = [
      [processingResponse, processingPayload],
      [reviewedResponse, reviewedPayload],
      [highRiskResponse, highRiskPayload],
    ].find(([response]) => !(response as Response).ok);
    if (failedMetric) {
      const [response, payload] = failedMetric as [Response, unknown];
      return NextResponse.json(payload, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: organizationPayload.data,
        contracts: contractsPayload.data,
        totalContracts: contractsPayload.meta?.total ?? contractsPayload.data.length,
        stats: {
          processing: processingPayload.meta?.total ?? 0,
          reviewed: reviewedPayload.meta?.total ?? 0,
          highRisk: highRiskPayload.meta?.total ?? 0,
        },
        role: claims.role ?? "owner",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể tải dữ liệu dashboard. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}
