import { useState, useEffect } from "react";
import { useListAccounts, useGetLedger } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/format";
import { BookOpen } from "lucide-react";

export default function LedgerPage() {
  const { data: accounts = [] } = useListAccounts();
  const [accountId, setAccountId] = useState<number | null>(null);
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accountId, accounts]);

  const { data: ledger } = useGetLedger(
    { accountId: accountId ?? 0, from, to },
    { query: { queryKey: [`/api/accounting/ledger`, accountId, from, to], enabled: !!accountId } },
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Ledger</h1>
        <p className="text-sm text-muted-foreground">View transactions per account</p>
      </div>
      <div className="flex gap-3 flex-wrap items-end">
        <div className="min-w-[260px]">
          <Label>Account</Label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={accountId ?? ""}
            onChange={(e) => setAccountId(Number(e.target.value))}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </div>
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      {!ledger ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div>
              <p className="font-semibold">{ledger.account.code} — {ledger.account.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{ledger.account.type}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Closing balance</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(ledger.closingBalance)}</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b border-border">
              <tr><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Source</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th><th className="p-3 text-right">Balance</th></tr>
            </thead>
            <tbody>
              {(Array.isArray(ledger.lines) ? ledger.lines : []).map((l) => (
                <tr key={l.lineId} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="p-3 text-xs">{formatDate(l.entryDate)}</td>
                  <td className="p-3 text-xs">{l.description ?? l.memo ?? "—"}</td>
                  <td className="p-3 text-[10px] text-muted-foreground">{l.sourceType ?? "manual"}{l.sourceId ? ` #${l.sourceId}` : ""}</td>
                  <td className="p-3 text-right">{l.debit > 0 ? formatCurrency(l.debit) : ""}</td>
                  <td className="p-3 text-right">{l.credit > 0 ? formatCurrency(l.credit) : ""}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(l.balance)}</td>
                </tr>
              ))}
              {(Array.isArray(ledger.lines) ? ledger.lines.length : 0) === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No transactions in this period</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
