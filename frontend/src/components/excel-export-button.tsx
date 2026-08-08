"use client";

import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";

export function downloadCsv({
  filename,
  rows,
  columns,
  amountKeys = [],
}: {
  filename: string;
  rows: Record<string, unknown>[];
  columns: string[];
  rowsKeys?: string[];
  amountKeys?: string[];
}) {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? v.toLocaleString("en-IN") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(esc).join(",");
  const lines = rows.map((r) => columns.map((c) => esc(r[c])).join(","));
  const csv = [header, ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv(
  rows: Record<string, unknown>[],
  columns: string[],
  filename: string,
) {
  downloadCsv({ filename, rows, columns });
}

export default function ExcelExportButton({
  rows,
  columns,
  filename,
  amountKeys = [],
  label = "Export Excel",
  disabled,
  onExport,
}: {
  rows: Record<string, unknown>[];
  columns: string[];
  filename: string;
  amountKeys?: string[];
  label?: string;
  disabled?: boolean;
  onExport?: () => void;
}) {
  function handleExport() {
    if (onExport) {
      onExport();
      return;
    }
    if (!rows || rows.length === 0) {
      toast({ title: "Nothing to export", description: "There is no data to download yet." });
      return;
    }
    downloadCsv({ filename, rows, columns, amountKeys });
    toast({ title: "Download started", description: `${filename}.csv has been generated (${rows.length} rows).` });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      disabled={disabled}
      className="gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-400 dark:border-emerald-500/40 shadow-sm font-medium"
    >
      <FileSpreadsheet className="h-4 w-4" />
      {label}
      <Download className="h-3.5 w-3.5 opacity-70" />
    </Button>
  );
}