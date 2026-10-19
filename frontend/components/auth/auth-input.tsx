import type { ComponentProps, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

const inputClasses =
  "relative box-border flex items-center min-h-[50px] border [background:#fff] [transition:border-color_0.18s,box-shadow_0.18s,background_0.18s] rounded-[10px] border-solid border-[#d5deea] focus-within:[background:#fff] focus-within:shadow-[0_0_0_4px_#0870f612] focus-within:border-[#1675f5] [&>_svg]:w-[18px] [&>_svg]:flex-none [&>_svg]:text-[#8290a3] [&>_svg]:ml-3.5 [&_input]:flex-auto [&_input]:w-auto [&_input]:min-w-0 [&_input]:h-12 [&_input]:box-border [&_input]:text-[#111c34] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:px-[13px] [&_input]:py-0 [&_input]:border-0 [&_input]:border-none [&_input]:border-current [&_input]:placeholder:text-[#a0aaba] [&_input]:[font-size:13px] [&_input]:[font-weight:450] [&_input:focus]:[outline:0] [&_input:focus]:shadow-none [&_input:focus-visible]:[outline:0] [&_input:focus-visible]:shadow-none motion-reduce:transition-none";
const invalidClasses =
  "[background:#fffafa] border-[#d45264] focus-within:shadow-[0_0_0_4px_#d84c6212] focus-within:border-[#c83a50]";
type AuthInputProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  icon: ComponentProps<typeof Icon>["name"];
  error?: string;
  trailing?: ReactNode;
};
export function AuthInput({
  id,
  label,
  icon,
  error,
  trailing,
  children,
  ...input
}: AuthInputProps) {
  return (
    <label
      className="grid gap-[7px] text-[#253650] text-[length:11px] font-[650]"
      htmlFor={id}
    >
      <span>{label}</span>
      <span className={inputClasses + (error ? " " + invalidClasses : "")}>
        <Icon name={icon} />
        <input
          {...input}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? id + "-error" : undefined}
        />
        {trailing}
      </span>
      {error && (
        <span
          id={id + "-error"}
          className="text-[#b52f43] text-[length:9px] font-[530] leading-[1.4] -mt-0.5"
          role="alert"
        >
          {error}
        </span>
      )}
      {children}
    </label>
  );
}
