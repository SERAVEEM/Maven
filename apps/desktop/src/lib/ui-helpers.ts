// ponytail: centralized UI helpers for member initials, avatar colors, and date formatting

export const MEMBER_COLORS = [
  '#579dff', // Blue
  '#8777d9', // Purple
  '#00b8d9', // Cyan
  '#ffab00', // Amber
  '#36b37e', // Green
  '#ff5630', // Red
  '#de350b', // Deep Orange
] as const;

/**
 * Returns a 2-character initials string from any user or assignee name.
 * Defaults to 'ME' if empty/null.
 */
export function getMemberInitials(assignee?: string | null): string {
  if (!assignee || !assignee.trim()) return 'ME';
  const parts = assignee.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return assignee.trim().slice(0, 2).toUpperCase();
}

/**
 * Deterministically generates a consistent avatar background color for any string.
 */
export function getMemberColor(nameOrInitials: string): string {
  let hash = 0;
  for (let i = 0; i < nameOrInitials.length; i++) {
    hash = nameOrInitials.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MEMBER_COLORS.length;
  return MEMBER_COLORS[index]!;
}

/**
 * Formats an ISO date string to readable short date (e.g. 'Nov 19, 2026').
 */
export function formatShortDate(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Converts an ISO date string to 'YYYY-MM-DDTHH:mm' local string for HTML datetime-local inputs.
 */
export function toLocalDatetimeInput(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
