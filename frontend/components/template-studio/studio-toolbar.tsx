"use client";

import type { ReactNode } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Table2,
  Undo2,
  Redo2,
  Plus,
  Minus,
} from "lucide-react";

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${active ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}
export function StudioToolbar({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            heading: [1, 2, 3].find((level) =>
              editor.isActive("heading", { level }),
            ),
            alignment: ["left", "center", "right", "justify"].find(
              (textAlign) => editor.isActive({ textAlign }),
            ),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            table: editor.isActive("table"),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
          }
        : null,
  });
  if (!editor) return <div className="h-11 animate-pulse bg-slate-50" />;
  return (
    <div
      className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-slate-200/80 bg-white px-3"
      role="toolbar"
      aria-label="Định dạng hợp đồng"
    >
      {[1, 2, 3].map((level) => (
        <Tool
          key={level}
          label={`Tiêu đề ${level}`}
          active={state?.heading === level}
          disabled={disabled}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 1 | 2 | 3 })
              .run()
          }
        >
          H{level}
        </Tool>
      ))}
      <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
      <Tool
        label="In đậm"
        active={state?.bold}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={15} />
      </Tool>
      <Tool
        label="In nghiêng"
        active={state?.italic}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={15} />
      </Tool>
      <Tool
        label="Gạch chân"
        active={state?.underline}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={15} />
      </Tool>
      <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
      {[
        { value: "left", label: "Căn trái", icon: AlignLeft },
        { value: "center", label: "Căn giữa", icon: AlignCenter },
        { value: "right", label: "Căn phải", icon: AlignRight },
        { value: "justify", label: "Căn đều", icon: AlignJustify },
      ].map((item) => (
        <Tool
          key={item.value}
          label={item.label}
          active={state?.alignment === item.value}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign(item.value).run()}
        >
          <item.icon size={15} />
        </Tool>
      ))}
      <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
      <Tool
        label="Danh sách đầu dòng"
        active={state?.bullet}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </Tool>
      <Tool
        label="Danh sách đánh số"
        active={state?.ordered}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </Tool>
      <Tool
        label="Chèn bảng"
        active={state?.table}
        disabled={disabled}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <Table2 size={16} />
      </Tool>
      {state?.table && (
        <>
          <Tool
            label="Thêm dòng bảng"
            disabled={disabled}
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <Plus size={15} />
          </Tool>
          <Tool
            label="Xóa dòng bảng"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            <Minus size={15} />
          </Tool>
        </>
      )}
      <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
      <Tool
        label="Hoàn tác"
        disabled={disabled || !state?.undo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={16} />
      </Tool>
      <Tool
        label="Làm lại"
        disabled={disabled || !state?.redo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={16} />
      </Tool>
    </div>
  );
}
