export type BillingCycle = "monthly" | "yearly";
export const subscriptionPlans = [
  { id: "basic", name: "Cơ bản", description: "Đủ để bắt đầu một quy trình rà soát chỉn chu.", monthly: 299000, annualMonthly: 249000, reviews: 20, pages: 300, members: 3, features: ["Phân tích rủi ro và giải thích điều khoản", "Nguồn tham chiếu cạnh kết quả", "Xuất báo cáo rà soát", "Lưu trữ hợp đồng tập trung"] },
  { id: "team", name: "Nhóm", description: "Cùng rà soát, phân công và đưa ra quyết định.", monthly: 799000, annualMonthly: 649000, reviews: 80, pages: 1500, members: 10, features: ["Toàn bộ quyền lợi của gói Cơ bản", "Phân công Reviewer và Staff", "Theo dõi lịch sử rà soát chung", "Báo cáo tổng quan doanh nghiệp"] },
] as const;
export type SubscriptionPlan = typeof subscriptionPlans[number];
export const formatMoney = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount) + "đ";
export const monthlyPrice = (plan: SubscriptionPlan, cycle: BillingCycle) => cycle === "yearly" ? plan.annualMonthly : plan.monthly;
export const demoOrganization = "Công ty An Phát";
