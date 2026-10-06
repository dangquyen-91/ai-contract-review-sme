import Image from "next/image";

export function Brand({ markOnly = false }: { markOnly?: boolean }) {
  return (
    <span className={`brand inline-flex items-center leading-none${markOnly ? " brand-mark-only" : ""}`}>
      <span className={`brand-image relative block flex-none overflow-hidden ${markOnly ? "h-10 w-10" : "h-[66px] w-[185px]"}`} aria-hidden="true">
        <Image
          className={markOnly ? "absolute inset-0 h-full w-full object-contain" : "absolute -left-0.5 -top-[22px] h-[103px] w-[189px] max-w-none"}
          src={markOnly ? "/logo-mark.png" : "/logo-transparent.png"}
          alt=""
          width={markOnly ? 1254 : 1698}
          height={markOnly ? 1254 : 926}
          sizes={markOnly ? "40px" : "185px"}
        />
      </span>
    </span>
  );
}
