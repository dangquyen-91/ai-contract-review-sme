import type { ReactNode } from "react";
import styles from "@/styles/review/review-layout.module.css";

export function ReviewLayout({ form, timeline, result, className = "" }: {
  form: ReactNode;
  timeline: ReactNode;
  result?: ReactNode;
  className?: string;
}) {
  return <div className={`${styles.layout} ${className}`}>
    <div className={styles.form}>{form}</div>
    <div className={styles.timeline}>{timeline}</div>
    {result && <div className={styles.results}>{result}</div>}
  </div>;
}
