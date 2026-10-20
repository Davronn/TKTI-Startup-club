export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>StartUp</strong>
          <small>CLUB PLATFORM</small>
        </span>
      )}
    </div>
  );
}
