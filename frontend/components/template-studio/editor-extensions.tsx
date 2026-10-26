"use client";

import { createContext, useContext } from "react";
import { Extension, Node, mergeAttributes, type Editor } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import type { ContractTemplate } from "@/types/contract-drafts";
import { studioFieldText } from "@/lib/studio-document";
import { LineItemsInput } from "@/components/contract-drafts/line-items-input";
import { StudioDocumentView } from "./studio-document-view";
import styles from "@/styles/template-studio.module.css";

export const StudioFieldsContext = createContext<{
  template: ContractTemplate;
  readOnly: boolean;
  onEdit: (key: string) => void;
} | null>(null);

export function updateStudioFields(
  editor: Editor,
  changes: Record<string, string>,
) {
  if (changes.termType === "indefinite") changes = { ...changes, endDate: "" };
  if (changes.salary !== undefined && changes.salaryInWords === undefined)
    changes = { ...changes, salaryInWords: "" };
  return editor.commands.command(({ tr, dispatch }) => {
    const found = new Set<string>();
    tr.doc.descendants((node, position) => {
      if (
        ["templateField", "templateItems"].includes(node.type.name) &&
        changes[node.attrs.key] !== undefined
      ) {
        found.add(node.attrs.key);
        tr.setNodeMarkup(position, undefined, {
          ...node.attrs,
          value: changes[node.attrs.key],
        });
      }
    });
    const keys = Object.keys(changes);
    if (keys.length === 1 && !found.has(keys[0]) && keys[0] !== "lineItems")
      tr.replaceSelectionWith(
        editor.schema.nodes.templateField.create({
          key: keys[0],
          value: changes[keys[0]],
        }),
      );
    if (dispatch) dispatch(tr);
    return true;
  });
}

function TemplateFieldView({ node }: NodeViewProps) {
  const context = useContext(StudioFieldsContext)!;
  const key = String(node.attrs.key);
  const value = String(node.attrs.value ?? "");
  const field = context.template.fields.find((item) => item.key === key);
  return (
    <NodeViewWrapper
      as="span"
      className={styles.fieldWrap}
      contentEditable={false}
    >
      <button
        type="button"
        data-field-key={key}
        className={`${styles.field} ${value ? styles.fieldFilled : styles.fieldEmpty}`}
        disabled={context.readOnly}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => context.onEdit(key)}
        title={field?.label}
        aria-label={`Điền ${field?.label ?? key}`}
      >
        {context.readOnly && !value && !field?.required
          ? "Không áp dụng"
          : studioFieldText(
              key,
              value,
              context.template,
              node.attrs.format ?? undefined,
            )}
      </button>
    </NodeViewWrapper>
  );
}
function TemplateItemsView({ node, editor }: NodeViewProps) {
  const context = useContext(StudioFieldsContext)!;
  if (context.readOnly)
    return (
      <NodeViewWrapper contentEditable={false} data-template-items>
        <StudioDocumentView
          document={{
            type: "doc",
            content: [
              {
                type: "templateItems",
                attrs: {
                  key: "lineItems",
                  value: String(node.attrs.value ?? ""),
                },
              },
            ],
          }}
          template={context.template}
        />
      </NodeViewWrapper>
    );
  return (
    <NodeViewWrapper
      contentEditable={false}
      className={styles.itemsEditor}
      data-template-items
    >
      <LineItemsInput
        value={String(node.attrs.value ?? "")}
        disabled={context.readOnly}
        compact
        onChange={(value, total) =>
          updateStudioFields(editor, { lineItems: value, price: total })
        }
      />
    </NodeViewWrapper>
  );
}

export const TemplateFieldExtension = Node.create({
  name: "templateField",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    key: { default: "" },
    value: { default: "" },
    format: { default: null },
  }),
  parseHTML: () => [{ tag: "span[data-template-field]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "span",
    mergeAttributes(HTMLAttributes, { "data-template-field": node.attrs.key }),
    String(node.attrs.value || `[${node.attrs.key}]`),
  ],
  addNodeView: () => ReactNodeViewRenderer(TemplateFieldView),
});
export const TemplateItemsExtension = Node.create({
  name: "templateItems",
  group: "block",
  atom: true,
  addAttributes: () => ({
    key: { default: "lineItems" },
    value: { default: "" },
  }),
  parseHTML: () => [{ tag: "div[data-template-items]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-template-items": "" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(TemplateItemsView),
});

const identifiedTypes = [
  "paragraph",
  "heading",
  "table",
  "bulletList",
  "orderedList",
  "templateItems",
  "pageBreak",
];
export const StudioPageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-page-break": "",
      class: styles.pageBreak,
      contenteditable: "false",
    }),
    ["span", {}, "TÁCH TRANG"],
  ],
});
export const StudioBlockIdentity = Extension.create({
  name: "studioBlockIdentity",
  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          appendix: {
            default: false,
            parseHTML: (element) => element.hasAttribute("data-appendix"),
            renderHTML: (attrs) =>
              attrs.appendix ? { "data-appendix": "" } : {},
          },
        },
      },
      {
        types: ["paragraph"],
        attributes: {
          placeholder: {
            default: null,
            parseHTML: (element) =>
              element.hasAttribute("data-appendix-placeholder")
                ? "appendix"
                : null,
            renderHTML: (attrs) =>
              attrs.placeholder === "appendix"
                ? {
                    "data-appendix-placeholder": "",
                    "data-placeholder": "Nhập nội dung phụ lục…",
                  }
                : {},
          },
        },
      },
      {
        types: identifiedTypes,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) =>
              attributes.blockId ? { "data-block-id": attributes.blockId } : {},
          },
        },
      },
      {
        types: ["table"],
        attributes: {
          layout: {
            default: "normal",
            parseHTML: (element) =>
              element.getAttribute("data-layout") ?? "normal",
            renderHTML: (attributes) => ({ "data-layout": attributes.layout }),
          },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, state) {
          if (!transactions.some((transaction) => transaction.docChanged))
            return null;
          const tr = state.tr;
          const seen = new Set<string>();
          state.doc.descendants((node, position) => {
            if (!identifiedTypes.includes(node.type.name)) return;
            const id = node.attrs.blockId;
            if (!id || seen.has(id))
              tr.setNodeMarkup(position, undefined, {
                ...node.attrs,
                blockId: crypto.randomUUID(),
              });
            seen.add(id || String(position));
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
