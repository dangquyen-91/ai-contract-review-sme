import Image from "next/image";

export function Brand({ markOnly = false }: { markOnly?: boolean }) {
  return (
    <span className={`brand${markOnly ? " brand-mark-only" : ""}`}>
      <span className="brand-image" aria-hidden="true">
        <Image
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
