import { Icon } from "@/components/ui/icon";

export function EmptyState({
  title = "Dữ liệu chưa sẵn sàng",
  description,
  icon = "document",
}: {
  title?: string;
  description: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <Icon name={icon} className="size-6" />
      </span>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

