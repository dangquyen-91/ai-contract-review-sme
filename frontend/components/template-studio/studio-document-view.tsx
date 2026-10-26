import type { ReactNode } from "react";
import type { StudioDocument, StudioNode } from "@/types/template-studio";
import type { ContractTemplate } from "@/types/contract-drafts";
import { studioFieldText } from "@/lib/studio-document";
import {
  readLineItems,
  lineItemAmount,
  centsToMoney,
} from "@/lib/draft-line-items";
import { formatMoneyInput } from "@/lib/money-input";
import styles from "@/styles/template-studio.module.css";

export function StudioDocumentView({
  document,
  template,
}: {
  document: StudioDocument;
  template: ContractTemplate;
}) {
  function render(node: StudioNode, key: number): ReactNode {
    if (node.type === "pageBreak")
      return (
        <div key={key} className={styles.pageBreak} data-page-break>
          <span>TÁCH TRANG</span>
        </div>
      );
    const children = node.content?.map(render);
    const textAlign = (node.attrs?.textAlign ?? undefined) as
      "left" | "center" | "right" | "justify" | undefined;
    let content: ReactNode = node.text ?? "";
    if (node.type === "templateField") {
      const field = template.fields.find(
        (item) => item.key === node.attrs?.key,
      );
      content =
        !node.attrs?.value && !field?.required
          ? "Không áp dụng"
          : studioFieldText(
              String(node.attrs?.key),
              String(node.attrs?.value ?? ""),
              template,
              node.attrs?.format as string | undefined,
            );
    }
    if (node.type === "text" || node.type === "templateField") {
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") content = <strong>{content}</strong>;
        if (mark.type === "italic") content = <em>{content}</em>;
        if (mark.type === "underline") content = <u>{content}</u>;
        if (mark.type === "strike") content = <s>{content}</s>;
      }
      return <span key={key}>{content}</span>;
    }
    if (node.type === "paragraph")
      return (
        <p key={key} style={{ textAlign }}>
          {children?.length ? children : "\u00a0"}
        </p>
      );
    if (node.type === "heading") {
      if (node.attrs?.level === 1)
        return (
          <h1 key={key} style={{ textAlign }}>
            {children}
          </h1>
        );
      if (node.attrs?.level === 3)
        return (
          <h3 key={key} style={{ textAlign }}>
            {children}
          </h3>
        );
      return (
        <h2 key={key} style={{ textAlign }}>
          {children}
        </h2>
      );
    }
    if (node.type === "hardBreak") return <br key={key} />;
    if (node.type === "bulletList") return <ul key={key}>{children}</ul>;
    if (node.type === "orderedList")
      return (
        <ol key={key} start={Number(node.attrs?.start ?? 1)}>
          {children}
        </ol>
      );
    if (node.type === "listItem") return <li key={key}>{children}</li>;
    if (node.type === "table")
      return (
        <table key={key} data-layout={String(node.attrs?.layout ?? "normal")}>
          <tbody>{children}</tbody>
        </table>
      );
    if (node.type === "tableRow") return <tr key={key}>{children}</tr>;
    if (node.type === "tableCell") return <td key={key}>{children}</td>;
    if (node.type === "tableHeader") return <th key={key}>{children}</th>;
    if (node.type === "templateItems") {
      const rows = readLineItems(String(node.attrs?.value ?? ""));
      if (!rows.length) return null;
      return (
        <table key={key}>
          <thead>
            <tr>
              {[
                "STT",
                "Tên hàng hóa / dịch vụ",
                "ĐVT",
                "Số lượng",
                "Đơn giá (VND)",
                "Thành tiền (VND)",
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{row.name}</td>
                <td>{row.unit}</td>
                <td>{row.quantity.replace(".", ",")}</td>
                <td>{formatMoneyInput(row.unitPrice)}</td>
                <td>
                  {formatMoneyInput(
                    centsToMoney(lineItemAmount(row) ?? BigInt(0)),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return <div key={key}>{children}</div>;
  }
  return <div className={styles.document}>{document.content.map(render)}</div>;
}
