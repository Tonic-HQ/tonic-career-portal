/**
 * JobChip — compact tag for job cards.
 *
 * Variants:
 *   text      — plain label (e.g. "Direct Hire", "Hybrid")
 *   icon      — icon + label (e.g. location pin + "New York, NY")
 *   range     — formatted range (e.g. "$95,000 - $120,000")
 *   experience — years (e.g. "5+ years")
 */

interface ChipProps {
  className?: string;
}

interface TextChipProps extends ChipProps {
  label: string;
}

interface IconChipProps extends ChipProps {
  label: string;
  icon: React.ReactNode;
}

interface RangeChipProps extends ChipProps {
  low?: number;
  high?: number;
  format?: "currency" | "number";
  unit?: string; // "per hour", "per year"
  icon?: React.ReactNode;
}

interface ExperienceChipProps extends ChipProps {
  years: number;
}

const baseClasses =
  "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-600 whitespace-nowrap";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function TextChip({ label, className = "" }: TextChipProps) {
  return <span className={`${baseClasses} ${className}`}>{label}</span>;
}

export function IconChip({ label, icon, className = "" }: IconChipProps) {
  return (
    <span className={`${baseClasses} ${className}`}>
      <span className="flex-shrink-0 text-gray-400">{icon}</span>
      {label}
    </span>
  );
}

function formatCurrencyCompact(value: number, isHourly: boolean): string {
  if (isHourly) {
    // Hourly rates: show decimals if present, e.g. $43 or $48.50
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }
  // Salary: no decimals, e.g. $95,000
  return formatCurrency(value);
}

export function RangeChip({
  low,
  high,
  format = "currency",
  unit,
  icon,
  className = "",
}: RangeChipProps) {
  if (!low && !high) return null;

  const isHourly = unit?.toLowerCase().includes("hour") ?? false;
  const fmt =
    format === "currency"
      ? (v: number) => formatCurrencyCompact(v, isHourly)
      : (v: number) => v.toLocaleString();

  let display: string;
  if (low && high && low !== high) {
    display = `${fmt(low)} - ${fmt(high)}`;
  } else if (low && high && low === high) {
    display = fmt(low);
  } else if (high) {
    display = `Up to ${fmt(high)}`;
  } else if (low) {
    display = `${fmt(low)}+`;
  } else {
    return null;
  }

  // Append unit label
  if (unit) {
    const u = unit.toLowerCase();
    if (u.includes("hour")) display += "/hr";
    else if (u.includes("year") || u.includes("annual")) display += "/yr";
    else if (u.includes("month")) display += "/mo";
    else display += ` ${unit}`;
  }

  return (
    <span className={`${baseClasses} ${className}`}>
      {icon && <span className="flex-shrink-0 text-gray-400">{icon}</span>}
      {display}
    </span>
  );
}

export function ExperienceChip({ years, className = "" }: ExperienceChipProps) {
  if (!years || years <= 0) return null;
  return (
    <span className={`${baseClasses} ${className}`}>
      {years}+ years
    </span>
  );
}

// Convenience icons
export const LocationIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const DollarIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const RemoteIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);
