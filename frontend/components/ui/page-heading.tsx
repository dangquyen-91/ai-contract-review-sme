export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
        {eyebrow}
      </p>
      <h1 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-[36px] lg:text-[40px]">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

