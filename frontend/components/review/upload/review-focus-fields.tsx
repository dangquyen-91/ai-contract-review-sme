type ReviewFocusFieldsProps = {
  id: string;
  value: string;
  disabled: boolean;
  autoFocus: boolean;
  onChange: (value: string) => void;
};

export function ReviewFocusFields({
  id,
  value,
  disabled,
  autoFocus,
  onChange,
}: ReviewFocusFieldsProps) {
  return (
    <>
      <label
        htmlFor={`${id}-focus`}
        className="mb-2 block text-ui font-semibold text-card-foreground"
      >
        Trọng tâm rà soát{" "}
        <span className="font-normal text-muted-foreground">
          (không bắt buộc)
        </span>
      </label>
      <textarea
        id={`${id}-focus`}
        aria-describedby={`${id}-hint`}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ví dụ: ưu tiên điều khoản thanh toán, phạt vi phạm và chấm dứt hợp đồng..."
        maxLength={1000}
        disabled={disabled}
        className="w-full min-h-28 resize-y border border-input bg-card text-card-foreground placeholder:text-muted-foreground placeholder:opacity-100 text-ui-document leading-[1.6] p-3 rounded-[9px] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-60"
      />
      <p
        id={`${id}-hint`}
        className="mb-0 mt-2 text-ui-meta leading-5 text-muted-foreground"
      >
        Để trống, AI vẫn rà soát toàn bộ hợp đồng. Chọn “Để sau” để giữ hợp đồng
        trong danh sách và chưa chạy AI.
      </p>
    </>
  );
}
