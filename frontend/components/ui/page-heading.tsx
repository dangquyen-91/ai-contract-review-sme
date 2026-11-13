import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
          {eyebrow}
        </p>
        <h1 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-[36px] lg:text-[40px]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
