// Shared, clearly labeled sample data for the admin overview and report page.
export const demoOrganizations = [
  "Nova Retail",
  "Công ty Luật Minh Khang",
  "An Phát Logistics",
  "Horizon Technology",
] as const;

export const demoDates = [
  "26/09",
  "27/09",
  "28/09",
  "29/09",
  "30/09",
  "01/10",
  "02/10",
  "03/10",
  "04/10",
  "05/10",
  "06/10",
  "07/10",
  "08/10",
  "09/10",
] as const;

export const demoActivity = demoDates.flatMap((day, dayIndex) =>
  demoOrganizations.map((organization, orgIndex) => {
    const success = 8 + orgIndex * 4 + ((dayIndex * 3 + orgIndex) % 7);
    const failed = (dayIndex + orgIndex * 2) % 4 === 0 ? 2 : 0;
    const high = Math.floor(success * (0.12 + orgIndex * 0.03));
    const medium = Math.floor(success * 0.34);
    return {
      day,
      organization,
      success,
      failed,
      high,
      medium,
      low: success - high - medium,
    };
  }),
);

export type DemoActivity = (typeof demoActivity)[number];
export type DemoCountKey = "success" | "failed" | "high" | "medium" | "low";

export const sumDemoActivity = (items: DemoActivity[], key: DemoCountKey) =>
  items.reduce((total, item) => total + item[key], 0);

export function filterDemoActivity(period: number, organization = "") {
  const dates = demoDates.slice(-period);
  return demoActivity.filter(
    (item) =>
      dates.includes(item.day) &&
      (!organization || item.organization === organization),
  );
}

export function getDemoDaily(items: DemoActivity[], period: number) {
  return demoDates.slice(-period).map((day) => {
    const dayItems = items.filter((item) => item.day === day);
    return {
      day,
      success: sumDemoActivity(dayItems, "success"),
      failed: sumDemoActivity(dayItems, "failed"),
    };
  });
}

export function getDemoUsage(items: DemoActivity[]) {
  return demoOrganizations.map((name) => {
    const organizationItems = items.filter(
      (item) => item.organization === name,
    );
    return {
      name,
      total:
        sumDemoActivity(organizationItems, "success") +
        sumDemoActivity(organizationItems, "failed"),
    };
  });
}
