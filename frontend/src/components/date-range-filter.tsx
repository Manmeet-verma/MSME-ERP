"use client";

import { Input } from "@/components/ui/input";
import { CalendarRange } from "lucide-react";
import { todayStr, weekRange, monthRange } from "@/lib/dates";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export default function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  function applyPreset(key: string) {
    if (key === "today") {
      onChange(todayStr(), todayStr());
    } else if (key === "week") {
      const r = weekRange();
      onChange(r.from, r.to);
    } else if (key === "month") {
      const r = monthRange();
      onChange(r.from, r.to);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        From
        <Input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange(e.target.value, to)}
          className="h-8 w-[9.5rem] text-xs"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        To
        <Input
          type="date"
          value={to}
          min={from || undefined}
          max={todayStr()}
          onChange={(e) => onChange(from, e.target.value)}
          className="h-8 w-[9.5rem] text-xs"
        />
      </label>
      <CalendarRange className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
