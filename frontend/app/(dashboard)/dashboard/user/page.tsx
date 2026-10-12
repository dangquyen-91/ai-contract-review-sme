import { redirect } from "next/navigation";

export default async function UserPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  redirect(view === "contracts" ? "/dashboard/user/contract" : "/dashboard/user/review");
}
