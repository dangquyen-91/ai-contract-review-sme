"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";
import { organizationsApi } from "@/lib/api/organizations";
import styles from "@/styles/onboarding.module.css";

export function CompanyChoice() {
  const router = useRouter();
  const [view, setView] = useState<"choice" | "create">("choice");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function continueWithoutOrganization() {
    setError("");
    setIsSubmitting(true);

    try {
      await authApi.completeOnboarding();
      router.replace("/");
      router.refresh();
    } catch (requestError) {
      setError(
        isApiClientError(requestError)
          ? requestError.message
          : "Không thể hoàn tất thiết lập. Vui lòng thử lại.",
      );
      setIsSubmitting(false);
    }
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const organizationName = name.trim();

    if (organizationName.length < 2) {
      setError("Tên tổ chức cần có ít nhất 2 ký tự.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await organizationsApi.create({ name: organizationName });
      await authApi.refreshToken();
      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(
        isApiClientError(requestError)
          ? requestError.message
          : "Không thể tạo tổ chức. Vui lòng thử lại.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.decisionContent}>
      {view === "choice" ? (
        <>
          <header className={styles.heading}>
            <p className={styles.kicker}>Bước thiết lập cuối cùng</p>
            <h1>Bạn đã thuộc công ty nào chưa?</h1>
            <p>Chọn cách bạn muốn bắt đầu. Bạn vẫn có thể cập nhật thông tin tổ chức sau.</p>
          </header>

          <div className={styles.choiceList} role="group" aria-label="Chọn trạng thái tổ chức">
            <button className={styles.choice} type="button" disabled={isSubmitting} onClick={continueWithoutOrganization}>
              <span className={styles.choiceIcon}><Icon name="user" /></span>
              <span className={styles.choiceCopy}>
                <strong>Chưa</strong>
                <small>Tiếp tục với tài khoản cá nhân và thiết lập tổ chức sau.</small>
              </span>
              <span className={styles.choiceArrow}><Icon name="arrow" /></span>
            </button>

            <button className={`${styles.choice} ${styles.choicePrimary}`} type="button" onClick={() => setView("create")}>
              <span className={styles.choiceIcon}><Icon name="building" /></span>
              <span className={styles.choiceCopy}>
                <strong>Tạo tổ chức</strong>
                <small>Tạo không gian chung để quản lý hợp đồng cùng đội ngũ.</small>
              </span>
              <span className={styles.choiceArrow}><Icon name="arrow" /></span>
            </button>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <p className={styles.helper}><Icon name="shield" />Thông tin tổ chức được bảo vệ trong tài khoản của bạn.</p>
        </>
      ) : (
        <>
          <button className={styles.backButton} type="button" onClick={() => { setView("choice"); setError(""); }}>
            <Icon name="arrow" />Quay lại lựa chọn
          </button>

          <header className={styles.heading}>
            <p className={styles.kicker}>Không gian làm việc chung</p>
            <h1>Tạo tổ chức của bạn</h1>
            <p>Nhập tên doanh nghiệp hoặc nhóm mà bạn sẽ dùng để rà soát hợp đồng.</p>
          </header>

          <form className={styles.organizationForm} onSubmit={createOrganization} noValidate>
            <label className={styles.field} htmlFor="organization-name">
              <span>Tên tổ chức</span>
              <span className={`${styles.inputShell} ${error ? styles.inputError : ""}`}>
                <Icon name="building" />
                <input
                  id="organization-name"
                  name="organizationName"
                  value={name}
                  onChange={(event) => { setName(event.target.value); setError(""); }}
                  placeholder="Ví dụ: Công ty Luật Minh Tâm"
                  autoComplete="organization"
                  maxLength={200}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "organization-error" : undefined}
                  autoFocus
                />
              </span>
            </label>

            {error && <p id="organization-error" className={styles.error} role="alert">{error}</p>}

            <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Đang tạo tổ chức..." : "Tạo tổ chức"}</span>
              {isSubmitting ? <i className={styles.loadingMark} aria-hidden="true" /> : <Icon name="arrow" />}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
