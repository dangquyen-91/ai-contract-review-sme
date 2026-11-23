type ClauseLabelSource = { index: number; label?: string; title?: string; text?: string };

export function clauseLabel(clause: ClauseLabelSource): string {
  if (clause.label) return clause.label;
  const heading = (clause.title?.trim() || clause.text?.trim().split(/\r?\n/, 1)[0] || "").normalize("NFC");
  const article = /^điều\s+(\d+[a-z]?)(?=[\s.:)\-–—]|$)/iu.exec(heading);
  return article ? `Điều ${article[1]}` : `Phần nội dung ${clause.index + 1}`;
}
