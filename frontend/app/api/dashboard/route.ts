import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";

export async function GET() {
  try {
    const session = await getApiSession();
    if (session.error) return session.error;
    const accessToken = session.accessToken;

    const claims = session.user;
    if (!claims.orgId) {
      return NextResponse.json(
        { success: false, error: { message: "Bạn cần thiết lập tổ chức trước khi mở dashboard." } },
        { status: 403 },
      );
    }

    const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
    const headers = { Authorization: `Bearer ${accessToken}` };

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

    const user = session.user;
    const contracts = (contractsPayload.data as Array<Record<string, unknown>>).map((contract) => {
      const currentVersion = contract.currentVersion as { overallRiskLevel?: string; fileName?: string } | undefined;
      return {
        ...contract,
        overallRiskLevel: currentVersion?.overallRiskLevel ?? "none",
        fileName: currentVersion?.fileName,
      };
    });

    let distribution;
    if (["staff", "expert", "manager"].includes(claims.role ?? "")) {
      const filters = ["status=uploaded", "status=archived", "riskLevel=medium", "riskLevel=low", "riskLevel=none"];
      const extraMetrics = await Promise.all(filters.map(async (filter) => {
        const response = await fetch(`${apiBaseUrl}/api/v1/contracts?limit=1&${filter}`, { headers, cache: "no-store" });
        const payload = await response.json();
        return { response, payload };
      }));
      const failed = extraMetrics.find(({ response }) => !response.ok);
      if (failed) return NextResponse.json(failed.payload, { status: failed.response.status });
      const totals = extraMetrics.map(({ payload }) => {
        const total = payload.meta?.total;
        if (!Number.isInteger(total) || total < 0) throw new Error("Missing contract count");
        return total as number;
      });
      distribution = {
        statuses: { uploaded: totals[0], processing: processingPayload.meta.total, reviewed: reviewedPayload.meta.total, archived: totals[1] },
        risks: { high: highRiskPayload.meta.total, medium: totals[2], low: totals[3], none: totals[4] },
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: organizationPayload.data,
        contracts,
        totalContracts: contractsPayload.meta?.total ?? contracts.length,
        ...(distribution ? { distribution } : {}),
        stats: {
          processing: processingPayload.meta?.total ?? 0,
          reviewed: reviewedPayload.meta?.total ?? 0,
          highRisk: highRiskPayload.meta?.total ?? 0,
        },
        role: claims.role ?? "user",
        user: user ? { name: user.name, email: user.email } : null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể tải dữ liệu dashboard. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}
