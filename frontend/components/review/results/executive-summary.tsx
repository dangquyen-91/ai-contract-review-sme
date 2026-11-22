import styles from "@/styles/review/review-design.module.css";

function PointList({ points, empty }: { points?: string[]; empty: string }) {
  if (!points?.length) return <p className={styles.executiveEmpty}>{empty}</p>;
  return (
    <ul className={styles.executiveList}>
      {points.map((point, index) => <li key={index}>{point}</li>)}
    </ul>
  );
}

export function ExecutiveSummary({ points, assessment, complete }: {
  points?: string[];
  assessment?: string[];
  complete?: boolean;
}) {
  return (
    <section className={`${styles.scope} ${styles.executive}`}>
      <div className="min-w-0">
        <h3 className={styles.sectionHeading}>Tóm tắt điều hành</h3>
        <PointList points={points} empty={complete ? "Chưa có ý tóm tắt để hiển thị." : "Tóm tắt chưa hoàn tất."} />
      </div>
      <div className="min-w-0">
        <h3 className={styles.sectionHeading}>Đánh giá tổng quan</h3>
        <PointList points={assessment} empty="Chưa có đánh giá tổng quan." />
      </div>
    </section>
  );
}
