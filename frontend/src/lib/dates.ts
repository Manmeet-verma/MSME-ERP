export function todayStr(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function toLocalStr(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function weekRange(): { from: string; to: string } {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = (day === 0 ? 7 : day) - 1;
  const monday = addDays(today, -diffToMonday);
  return { from: toLocalStr(monday), to: todayStr() };
}

export function monthRange(): { from: string; to: string } {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: toLocalStr(first), to: todayStr() };
}

export function formatDateLabel(d: string): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function dateKey(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (typeof v === "number") return new Date(v).toISOString().slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o._seconds === "number") return new Date(o._seconds * 1000).toISOString().slice(0, 10);
    const toDate = (o as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") {
      const d = toDate.call(v);
      if (d) return d.toISOString().slice(0, 10);
    }
  }
  return String(v).slice(0, 10);
}

export function inDateRange(v: unknown, from: string, to: string): boolean {
  if (!from || !to || from > to) return false;
  const k = dateKey(v);
  return !!k && k >= from && k <= to;
}
