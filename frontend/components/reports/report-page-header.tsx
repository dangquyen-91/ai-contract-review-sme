import { BarChart3, CalendarDays, Globe2 } from "lucide-react";
import styles from "./reports.module.css";

export function ReportPageHeader({
  title,
  description,
  scope,
}: {
  title: string;
  description: string;
  scope: string;
}) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>
          <BarChart3 aria-hidden="true" size={15} /> LawScan Analytics
        </p>
        <h1>{title}</h1>
        <p className={styles.heroDescription}>{description}</p>
        <div className={styles.heroTags}>
          <span>
            <Globe2 aria-hidden="true" size={13} />
            {scope}
          </span>
          <span>
            <CalendarDays aria-hidden="true" size={13} />
            Múi giờ Việt Nam
          </span>
        </div>
      </div>
      <div className={styles.heroGraphic} aria-hidden="true">
        <div className={styles.graphicLabel}>PHÂN TÍCH & THỐNG KÊ</div>
        <div className={styles.graphicBars}>
          {[35, 58, 43, 76, 62, 91, 72, 100].map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
        <div className={styles.graphicCaption}>
          Dữ liệu rõ ràng. Quyết định hiệu quả.
        </div>
      </div>
    </header>
  );
}
