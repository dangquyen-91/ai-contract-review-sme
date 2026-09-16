export function Brand({ markOnly = false }: { markOnly?: boolean }) {
  return (
    <span className="brand">
      <svg width="37" height="44" viewBox="0 0 37 44" fill="none" aria-hidden="true">
        <path d="M3 11h9v25h18v8H3z" fill="#0066FF" />
        <path d="M17 1 35 18v18l-8-8H17z" fill="#0066FF" />
        <path d="m11 8 6-7v27l10 0 8 8H11z" fill="#1680FF" />
        <path d="M12 8h5v21h11l7 7H12z" fill="#EAF3FF" />
      </svg>
      {!markOnly && <span>LawScan</span>}
    </span>
  );
}
