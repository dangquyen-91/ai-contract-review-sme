"use client";

import { Icon } from "@/components/ui/icon";
import styles from "@/app/(marketing)/bao-cao-mau/sample-report.module.css";

export function PrintReportButton() {
  return <button className={styles.printButton} type="button" onClick={() => window.print()}><Icon name="download" />In hoặc lưu PDF</button>;
}
