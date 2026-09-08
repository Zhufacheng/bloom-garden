const line = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#ffca28" stroke="#ffb300" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#ffb300" strokeWidth="2" />
    </svg>
  );
}

export function WaterIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" {...line}>
      <rect x="4.5" y="11" width="9" height="8" rx="2" />
      <path d="M13.5 13.5 19 8" />
      <circle cx="19.6" cy="7.4" r="1.7" />
      <path d="M7 11c0-3.2 4.5-3.2 4.5 0" />
    </svg>
  );
}

export function BasketIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" {...line}>
      <path d="M4.5 10.5h15L18 19a2 2 0 0 1-2 1.6H8A2 2 0 0 1 6 19l-1.5-8.5Z" />
      <path d="M8.5 10.5c0-4.5 7-4.5 7 0" />
      <path d="M9.5 13.5v3.5M12 13.5v3.5M14.5 13.5v3.5" />
    </svg>
  );
}

export function BagIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" {...line}>
      <path d="M6.5 8.5h11L16.5 20a2 2 0 0 1-2 1.9h-5a2 2 0 0 1-2-1.9l-1-11.5Z" />
      <path d="M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5" />
      <path d="M12 12.5c-1.8.8-2.2 2.6-1.3 4 1.4-.4 2.4-1.7 1.3-4Z" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...line}>
      <rect x="6" y="10.5" width="12" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

export function DropIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5c3.2 4.2 6.5 7.4 6.5 10.7a6.5 6.5 0 0 1-13 0C5.5 10.9 8.8 7.7 12 3.5Z" />
    </svg>
  );
}
