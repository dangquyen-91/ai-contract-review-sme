export interface ClauseOffsets {
  startOffset?: number;
  endOffset?: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function locateClauseOffsets(fullText: string, clauseTexts: string[]): ClauseOffsets[] {
  let cursor = 0;

  return clauseTexts.map((clauseText) => {
    const needle = clauseText.trim();
    if (!needle) return {};

    const exactIdx = fullText.indexOf(needle, cursor);
    if (exactIdx !== -1) {
      cursor = exactIdx + needle.length;
      return { startOffset: exactIdx, endOffset: cursor };
    }

    const pattern = needle.split(/\s+/).map(escapeRegExp).join('\\s+');
    const match = new RegExp(pattern).exec(fullText.slice(cursor));
    if (!match) return {};

    const startOffset = cursor + match.index;
    cursor = startOffset + match[0].length;
    return { startOffset, endOffset: cursor };
  });
}
