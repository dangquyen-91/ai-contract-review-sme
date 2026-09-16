import type { SVGProps } from "react";

const paths = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  diagonal: "M6 18 18 6M6 6h12v12",
  document: "M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h8",
  search: "M21 21l-6-6M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  scales: "M12 2v20M7 22h10M3 6h18M6 6 1 16h10L6 6Zm12 0-5 10h10L18 6Z",
  user: "M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-4a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v4H4Z",
  team: "M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM6 22v-4a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v4M19 3a4 4 0 0 1 0 7M21 13a5 5 0 0 1 2 4v4M5 3a4 4 0 0 0 0 7M3 13a5 5 0 0 0-2 4v4",
  check: "m5 12 4 4L19 6",
  sparkle: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
  upload: "M12 16V3m0 0L7 8m5-5 5 5M4 15v6h16v-6",
  shield: "M12 2 20 6v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4Zm-3 10 2 2 4-5",
  download: "M12 3v13m0 0 5-5m-5 5-5-5M4 21h16",
  briefcase: "M9 6V4h6v2m6 4H3m1-4h16v15H4V6Zm6 4v3h4v-3",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  lock: "M6 10V7a6 6 0 0 1 12 0v3m-13 0h14v12H5V10Zm7 5v3",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10-3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z",
  eyeOff: "m3 3 18 18M10.6 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-2.1 2.8M6.5 6.5C3.6 8.3 2 12 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.8-.7M9.9 9.9a3 3 0 0 0 4.2 4.2",
  building: "M4 22V4h11v18M8 8h3M8 12h3M8 16h3m4-6h5v12H2m15-8h1m-1 4h1",
} as const;

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
