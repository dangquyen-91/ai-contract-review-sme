import type { TemplateStudioState } from "@/hooks/use-template-studio";
import type { AuthUser } from "@/types/auth";
import { readLineItems, totalLineItems } from "@/lib/draft-line-items";
import { studioCharacterCount } from "@/lib/studio-document";

export type StudioPresentation = ReturnType<typeof getStudioPresentation>;
export function getStudioPresentation(
  studio: TemplateStudioState,
  user: AuthUser,
) {
  const { draft, values, busy, dirty, error } = studio;
  const owner = user.role === "owner";
  const readOnly = draft.status !== "draft";
  const editable = !readOnly && (!busy || busy === "save");
  const canExport =
    draft.status === "approved" && (owner || draft.createdBy === user.id);
  const missing = draft.template.fields.filter((field) => {
    const required =
      field.required ||
      (field.key === "endDate" &&
        (draft.templateCode !== "labor" || values.input.termType === "fixed"));
    if (!required) return false;
    const value = values.input[field.key] ?? "";
    return field.kind === "items"
      ? !totalLineItems(readLineItems(value))
      : !value.trim();
  });
  const outline = values.document.content
    .filter((node) => node.type === "heading")
    .map((node) => ({
      id: String(node.attrs?.blockId),
      text: node.content?.map((item) => item.text ?? "").join("") ?? "",
    }));
  let status = "Đã lưu";
  if (dirty) status = "Chưa lưu";
  if (busy === "save") status = "Đang lưu…";
  if (dirty && error) status = "Chưa lưu được";
  const characterCount = studioCharacterCount(values.document, draft.template);
  return {
    owner,
    readOnly,
    editable,
    canExport,
    missing,
    outline,
    status,
    characterCount,
  };
}
