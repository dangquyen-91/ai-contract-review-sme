export function dashboardInsightsFixture(role = 'expert', period = 'month', empty = false) {
  const metrics = {
    organizations: 17, users: 143, uploads: 28, completed: 34, failed: 3, successRate: 34 / 37 * 100,
    averageDurationMs: 82500, receivedAmount: 4289000, unfulfilled: 1, queued: 2, running: 4,
    highRisk: 6, openVerification: 5, contracts: 54, processing: 4,
    waiting: 127, inProgress: 6, approved: 19, returned: 4,
    legalSources: 68, inForce: 51, updated: 12, ingestionFailed: 2, ingestionPending: 3,
    analysisUnits: 38, chatUnits: 67, draftingUnits: 8,
  };
  const distribution = role === 'administrator' ? [{ key: 'Công ty TNHH Thương mại và Dịch vụ Minh Khôi', value: 18 }, { key: 'An Phát Logistics', value: 12 }]
    : role === 'owner' ? [{ key: 'high', value: 6 }, { key: 'medium', value: 11 }, { key: 'low', value: 8 }, { key: 'none', value: 3 }, { key: 'unknown', value: 1 }]
    : role === 'expert' ? [{ key: 'approved', value: 19 }, { key: 'returned', value: 4 }]
    : role === 'manager' ? [{ key: 'in_force', value: 51 }, { key: 'amended', value: 8 }, { key: 'repealed', value: 9 }]
    : [{ key: 'uploaded', value: 4 }, { key: 'processing', value: 4 }, { key: 'reviewed', value: 41 }, { key: 'archived', value: 5 }];
  const fields = role === 'expert' ? ['approved', 'returned'] : role === 'manager' ? ['updated'] : ['uploads', 'completed', 'failed'];
  const start = period === 'year' ? '2026-01-01' : period === 'quarter' ? '2026-10-01' : period === 'week' ? '2026-11-09' : '2026-11-01';
  return {
    role, scope: { type: role === 'user' ? 'personal' : ['owner', 'staff'].includes(role) ? 'organization' : role === 'expert' ? 'expert' : 'system', id: null },
    computedAt: '2026-11-15T05:00:00Z', timezone: 'Asia/Ho_Chi_Minh',
    period: { kind: period, startDate: start, endDate: '2026-11-15', toExclusive: '2026-11-15T05:00:00Z', partial: true },
    metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, empty ? key === 'averageDurationMs' || key === 'successRate' ? null : 0 : value])),
    distribution: distribution.map(row => ({ ...row, value: empty ? 0 : row.value })),
    trend: Array.from({ length: 10 }, (_, index) => ({ date: `2026-11-${String(index + 1).padStart(2, '0')}`, ...Object.fromEntries(fields.map((key, field) => [key, empty ? 0 : (index * 3 + field + 1) % 8])) })),
  };
}
