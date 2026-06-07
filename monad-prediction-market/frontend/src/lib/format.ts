import { formatEther } from "viem";

/** Format a wei bigint as MON with 4 decimal places. */
export function formatMon(value: bigint): string {
  return Number(formatEther(value)).toFixed(4);
}

/** Short 0x… address. */
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Human countdown from now until a unix-second deadline. */
export function countdown(deadlineSec: bigint): string {
  const remaining = Number(deadlineSec) - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "closed";

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
