"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Plus } from "lucide-react";
import type { StudioDocument, StudioSelection } from "@/types/template-studio";
import type { ContractTemplate } from "@/types/contract-drafts";
import { studioInput } from "@/lib/contract-drafts/studio-document";
import {
  StudioFieldsContext,
  TemplateFieldExtension,
  TemplateItemsExtension,
  StudioBlockIdentity,
  StudioPageBreak,
  updateStudioFields,
} from "./editor-extensions";
import { StudioToolbar } from "./studio-toolbar";
import { StudioFieldDialog } from "./studio-field-dialog";
import styles from "@/styles/template-studio.module.css";

export function StudioEditor({
  document,
  epoch,
  template,
  disabled,
  onChange,
  onSelection,
  requestedField,
  onFieldHandled,
}: {
  document: StudioDocument;
  epoch: number;
  template: ContractTemplate;
  disabled: boolean;
  onChange: (value: StudioDocument) => void;
  onSelection: (value: StudioSelection) => void;
  requestedField: string | null;
  onFieldHandled: () => void;
}) {
  const [fieldKey, setFieldKey] = useState<string | null>(null);
  const changeRef = useRef(onChange);
  const selectionRef = useRef(onSelection);
  const [initial] = useState(document);
  const appliedEpoch = useRef(epoch);
  useEffect(() => {
    changeRef.current = onChange;
    selectionRef.current = onSelection;
  }, [onChange, onSelection]);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        link: false,
        blockquote: false,
        horizontalRule: false,
      }),
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      TemplateFieldExtension,
      TemplateItemsExtension,
      StudioBlockIdentity,
      StudioPageBreak,
    ],
    content: initial,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: styles.document,
        "aria-label": "Nội dung hợp đồng",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) =>
      changeRef.current(editor.getJSON() as StudioDocument),
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        selectionRef.current({ blockIds: [], text: "" });
        return;
      }
      const ids = new Set<string>();
      editor.state.doc.forEach((node, offset) => {
        if (offset < to && offset + node.nodeSize > from && node.attrs.blockId)
          ids.add(node.attrs.blockId);
      });
      selectionRef.current({
        blockIds: [...ids].slice(0, 20),
        text: editor.state.doc.textBetween(from, to, " ").slice(0, 400),
      });
    },
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    if (editor && appliedEpoch.current !== epoch) {
      editor.commands.setContent(document, { emitUpdate: false });
      appliedEpoch.current = epoch;
    }
  }, [editor, document, epoch]);
  const context = useMemo(
    () => ({ template, readOnly: disabled, onEdit: setFieldKey }),
    [template, disabled],
  );
  const field = template.fields.find(
    (item) => item.key === (requestedField ?? fieldKey),
  );
  const values = editor
    ? studioInput(editor.getJSON() as StudioDocument)
    : studioInput(document);
  return (
    <StudioFieldsContext.Provider value={context}>
      <StudioToolbar editor={editor} disabled={disabled} />
      <div className={styles.canvas}>
        <div className={styles.paper}>
          <EditorContent editor={editor} />
          {!disabled && (
            <button
              type="button"
              className={styles.addAppendix}
              onClick={() => {
                if (!editor) return;
                const count =
                  editor
                    .getJSON()
                    .content?.filter(
                      (node) => node.type === "heading" && node.attrs?.appendix,
                    ).length ?? 0;
                editor
                  .chain()
                  .focus("end")
                  .insertContentAt(editor.state.doc.content.size, [
                    { type: "pageBreak" },
                    {
                      type: "heading",
                      attrs: { level: 2, appendix: true },
                      content: [{ type: "text", text: `PHỤ LỤC ${count + 1}` }],
                    },
                    { type: "paragraph", attrs: { placeholder: "appendix" } },
                  ])
                  .focus("end")
                  .run();
              }}
            >
              <Plus size={18} />
              Thêm phụ lục
            </button>
          )}
        </div>
      </div>
      {field && !disabled && (
        <StudioFieldDialog
          key={field.key}
          field={field}
          value={values[field.key] ?? ""}
          onClose={() => {
            setFieldKey(null);
            onFieldHandled();
          }}
          onSave={(value) => {
            if (editor) updateStudioFields(editor, { [field.key]: value });
            setFieldKey(null);
            onFieldHandled();
          }}
        />
      )}
    </StudioFieldsContext.Provider>
  );
}
