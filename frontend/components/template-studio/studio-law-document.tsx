import type { StudioLaw, StudioLawPreview } from "@/types/template-studio";

const headingLabels = {
  part: "Phần",
  chapter: "Chương",
  section: "Mục",
  subsection: "Tiểu mục",
};

export function StudioLawDocument({
  source,
  chunks,
}: {
  source: StudioLaw;
  chunks: StudioLawPreview["chunks"];
}) {
  const issued =
    source.issuedDate && !Number.isNaN(Date.parse(source.issuedDate))
      ? new Date(source.issuedDate)
      : null;
  const issuedText = issued
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(issued)
    : "";
  return (
    <article
      aria-label="Nội dung văn bản pháp luật"
      className="pb-4 pr-1 text-[14px] leading-7 text-slate-700 sm:text-[15px]"
    >
      <header className="mb-10 pt-3">
        <div className="grid grid-cols-[1fr_1.6fr] gap-3 text-center text-xs font-medium leading-6 sm:text-sm">
          <div>
            {source.issuingBody && (
              <>
                <p className="uppercase">{source.issuingBody}</p>
                <p aria-hidden="true">--------</p>
              </>
            )}
          </div>
          <div>
            <p className="font-semibold uppercase">
              Cộng hòa xã hội chủ nghĩa Việt Nam
            </p>
            <p>Độc lập - Tự do - Hạnh phúc</p>
            <p aria-hidden="true">---------------</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-slate-200 pt-1 text-xs sm:text-sm">
          {source.documentNumber && <p>Số: {source.documentNumber}</p>}
          {(source.issuingPlace || issuedText) && (
            <p className="ml-auto italic">
              {[source.issuingPlace, issuedText].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <h2 className="mx-auto mb-8 mt-12 max-w-xl text-center text-base font-semibold uppercase leading-8 text-slate-800">
          {source.title}
        </h2>
      </header>
      <div className="space-y-8">
        {chunks.map((chunk, index) => {
          const previous = chunks[index - 1]?.hierarchy ?? [];
          const hierarchy = chunk.hierarchy ?? [];
          const firstLine = chunk.text.split("\n")[0].trim();
          const textHasHeading = /^Điều\s+\d+/i.test(firstLine);
          return (
            <section key={chunk.id}>
              {hierarchy.map((heading, position) =>
                JSON.stringify(hierarchy.slice(0, position + 1)) ===
                JSON.stringify(previous.slice(0, position + 1)) ? null : (
                  <div
                    key={`${heading.level}-${heading.number}`}
                    className="mb-7 pt-3 text-slate-800"
                  >
                    <p className="font-semibold">
                      {headingLabels[heading.level]} {heading.number}
                    </p>
                    {heading.title && (
                      <h3 className="mt-2 text-center font-semibold uppercase">
                        {heading.title}
                      </h3>
                    )}
                  </div>
                ),
              )}
              {!textHasHeading && (chunk.articleRef || chunk.articleTitle) && (
                <h3 className="mb-2 font-semibold text-slate-800">
                  {[chunk.articleRef, chunk.articleTitle]
                    .filter(Boolean)
                    .join(". ")}
                </h3>
              )}
              <div className="space-y-3">
                {chunk.text.split(/\n+/).map((line, lineIndex) =>
                  /^Điều\s+\d+/i.test(line.trim()) ? (
                    <h3
                      key={lineIndex}
                      className="font-semibold text-slate-800"
                    >
                      {line}
                    </h3>
                  ) : (
                    <p
                      key={lineIndex}
                      className="whitespace-pre-wrap break-words"
                    >
                      {line}
                    </p>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
