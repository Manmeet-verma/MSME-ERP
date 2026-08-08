"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DailyReportsPanel from "@/components/daily-reports-panel";
import DateRangeFilter from "@/components/date-range-filter";
import { todayStr } from "@/lib/dates";
import { getCurrentRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, ShieldCheck } from "lucide-react";

const VIEW_REPORT_ROLES = ["owner", "admin"];

export default function DailyReportsViewPage() {
  const router = useRouter();
  const role = getCurrentRole();
  const [from, setFrom] = useState<string>(todayStr());
  const [to, setTo] = useState<string>(todayStr());

  if (!VIEW_REPORT_ROLES.includes(role ?? "")) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-md mx-auto">
        <div className="bg-card border border-card-border rounded-xl p-6 text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Daily reports are for owners only</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sales executives can submit their own daily reports instead.
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/daily-report")}>Go to Daily Report</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <div>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Sales Executive Reports</h1>
              <p className="text-sm text-muted-foreground">View all daily reports submitted by your sales team</p>
            </div>
          </div>
          <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>
      </div>

      <DailyReportsPanel title="All Daily Reports" from={from} to={to} onRangeChange={(f, t) => { setFrom(f); setTo(t); }} />
    </div>
  );
}