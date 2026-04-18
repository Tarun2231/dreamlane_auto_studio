export const SLOT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toYmd(year: number, monthIndex: number, day: number) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

/** Day-of-month cells for a calendar grid (null = empty padding). */
export function monthGridCells(year: number, monthIndex: number): (number | null)[] {
  const firstDow = new Date(year, monthIndex, 1).getDay();
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isTodayYmd(viewY: number, viewM: number, day: number) {
  const t = new Date();
  return t.getFullYear() === viewY && t.getMonth() === viewM && t.getDate() === day;
}
