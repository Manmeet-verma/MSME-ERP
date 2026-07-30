"use client";

import { useState, useRef, useCallback, useMemo } from "react";

import {
  useListClients, useListProducts, useListAddons, useListItems, useListLeads,
  useCreateQuotation, useAddQuotationItem, useAddQuotationAddon, useCreateClient,
} from "@workspace/api-client-react";
import type { ClientInput } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronLeft, Loader2, Package, Puzzle, Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type LineItem = {
  id: string;
  productId: number;
  productName: string;
  itemId: number | null;
  description: string;
  widthFt: string;
  heightFt: string;
  quantity: string;
  unitPrice: number;
  unit: string;
};

type AddonLine = {
  id: string;
  addonId: number;
  addonName: string;
  description: string;
  quantity: string;
  price: number;
};

function calcItemTotal(item: LineItem): number {
  const qty = parseFloat(item.quantity) || 0;
  const w = parseFloat(item.widthFt) || 0;
  const h = parseFloat(item.heightFt) || 0;
  if (w > 0 && h > 0) return w * h * qty * item.unitPrice;
  return qty * item.unitPrice;
}

function calcAddonTotal(a: AddonLine): number {
  return (parseFloat(a.quantity) || 0) * a.price;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { data: clients } = useListClients({});
  const { data: products } = useListProducts({});
  const { data: addons } = useListAddons();
  const { data: inventoryItems } = useListItems();
  const { data: leads } = useListLeads({});
  const createClientMut = useCreateClient();

  const [clientId, setClientId] = useState<number | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const clientRef = useRef<HTMLButtonElement>(null);

  const clientOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: { label: string; value: number; type: "client" | "lead"; lead?: any }[] = [];
    for (const c of Array.isArray(clients) ? clients : []) {
      const label = c.name || c.phone || `Client #${c.id}`;
      result.push({ label: label + (c.company ? ` — ${c.company}` : ""), value: c.id, type: "client" });
      seen.add(label.toLowerCase());
    }
    for (const l of Array.isArray(leads) ? leads : []) {
      const label = l.name || l.phone || `Lead #${l.id}`;
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ label: label + (l.company ? ` — ${l.company}` : ""), value: l.id, type: "lead", lead: l });
      }
    }
    return result;
  }, [clients, leads]);

  const selectedLabel = clientId
    ? clientOptions.find((o) => o.value === clientId)?.label ?? clientSearch
    : clientSearch || "";
  const [validDays, setValidDays] = useState("30");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within 30 days. Prices valid for 30 days.");
  const [discountPct, setDiscountPct] = useState("0");
  const [taxPct, setTaxPct] = useState("18");
  const [items, setItems] = useState<LineItem[]>([]);
  const [addonLines, setAddonLines] = useState<AddonLine[]>([]);

  const createMutation = useCreateQuotation();
  const addItemMutation = useAddQuotationItem();
  const addAddonMutation = useAddQuotationAddon();

  function addItem(productId: number) {
    const p = (Array.isArray(products) ? products : []).find((x) => x.id === productId);
    if (!p) return;
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        productId: p.id,
        productName: p.name,
        itemId: null,
        description: p.name,
        widthFt: "",
        heightFt: "",
        quantity: "1",
        unitPrice: p.basePrice,
        unit: p.unit,
      },
    ]);
  }

  function addAddon(addonId: number) {
    const a = (Array.isArray(addons) ? addons : []).find((x) => x.id === addonId);
    if (!a) return;
    setAddonLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        addonId: a.id,
        addonName: a.name,
        description: a.name,
        quantity: "1",
        price: a.price,
      },
    ]);
  }

  function removeItem(id: string) { setItems((prev) => prev.filter((x) => x.id !== id)); }
  function removeAddon(id: string) { setAddonLines((prev) => prev.filter((x) => x.id !== id)); }

  const itemsTotal = items.reduce((s, i) => s + calcItemTotal(i), 0);
  const addonsTotal = addonLines.reduce((s, a) => s + calcAddonTotal(a), 0);
  const subtotal = itemsTotal + addonsTotal;
  const discountAmt = subtotal * (parseFloat(discountPct) / 100);
  const taxAmt = (subtotal - discountAmt) * (parseFloat(taxPct) / 100);
  const total = subtotal - discountAmt + taxAmt;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId && !clientSearch) { toast({ title: "Please select or type a client", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Add at least one product", variant: "destructive" }); return; }

    let effectiveClientId = clientId;

    if (!effectiveClientId && clientSearch) {
      const opt = clientOptions.find((o) => o.label === clientSearch || o.label.startsWith(clientSearch));
      if (opt) {
        if (opt.type === "lead") {
          const lead = opt.lead;
          const newClient = await createClientMut.mutateAsync({
            data: {
              name: lead.name, email: lead.email ?? undefined,
              phone: lead.phone ?? undefined, company: lead.company ?? undefined,
              city: lead.city ?? undefined, state: lead.state ?? undefined,
              gstNumber: (lead as any).gstin ?? undefined,
            } as ClientInput,
          });
          effectiveClientId = newClient.id;
        } else {
          effectiveClientId = opt.value;
        }
      } else {
        const newClient = await createClientMut.mutateAsync({
          data: { name: clientSearch } as ClientInput,
        });
        effectiveClientId = newClient.id;
      }
    }

    if (!effectiveClientId) { toast({ title: "Please select a client", variant: "destructive" }); return; }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + parseInt(validDays));

    try {
      const q = await createMutation.mutateAsync({
        data: {
          clientId: effectiveClientId,
          validUntil: validUntil.toISOString(),
          notes,
          terms,
          discountPercent: parseFloat(discountPct),
          taxPercent: parseFloat(taxPct),
        },
      });

      const qId = q.id;
      await Promise.all([
        ...items.map((item) =>
          addItemMutation.mutateAsync({
            id: qId,
            data: {
              productId: item.productId,
              itemId: item.itemId ?? null,
              description: item.description,
              widthFt: item.widthFt ? parseFloat(item.widthFt) : undefined,
              heightFt: item.heightFt ? parseFloat(item.heightFt) : undefined,
              quantity: parseFloat(item.quantity),
              unitPrice: item.unitPrice,
            },
          })
        ),
        ...addonLines.map((a) =>
          addAddonMutation.mutateAsync({
            id: qId,
            data: {
              addonId: a.addonId,
              description: a.description,
              quantity: parseFloat(a.quantity),
              price: a.price,
            },
          })
        ),
      ]);

      toast({ title: "Quotation created!" });
      router.push(`/dashboard/quotations/${qId}`);
    } catch {
      toast({ title: "Failed to create quotation", variant: "destructive" });
    }
  }

  const isSubmitting = createMutation.isPending || addItemMutation.isPending || addAddonMutation.isPending || createClientMut.isPending;

  return (
    
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard/quotations")} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">New Quotation</h1>
            <p className="text-sm text-muted-foreground">Build a new LED display quotation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Items */}
            <div className="lg:col-span-2 space-y-5">
              {/* Client & meta */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quotation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Client *</Label>
                      <Popover open={clientOpen} onOpenChange={setClientOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            ref={clientRef}
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientOpen}
                            className="w-full justify-between font-normal"
                          >
                            {selectedLabel || "Search or type client name..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Search clients & leads..."
                              value={clientSearch}
                              onValueChange={(v) => { setClientSearch(v); if (v !== selectedLabel) setClientId(null); }}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {clientSearch ? (
                                  <CommandItem
                                    onSelect={() => { setClientId(null); setClientOpen(false); }}
                                    className="gap-2 text-primary"
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                    Create client &ldquo;{clientSearch}&rdquo;
                                  </CommandItem>
                                ) : (
                                  <p className="py-4 text-center text-xs text-muted-foreground">No clients or leads found.</p>
                                )}
                              </CommandEmpty>
                              {clientOptions.filter((o) => o.type === "client").length > 0 && (
                                <CommandGroup heading="Clients">
                                  {clientOptions
                                    .filter((o) => o.type === "client")
                                    .map((o) => (
                                      <CommandItem
                                        key={`c-${o.value}`}
                                        value={`client-${o.label.toLowerCase()}`}
                                        onSelect={() => { setClientId(o.value); setClientSearch(o.label); setClientOpen(false); }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", clientId === o.value ? "opacity-100" : "opacity-0")} />
                                        {o.label}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}
                              {clientOptions.filter((o) => o.type === "lead").length > 0 && (
                                <CommandGroup heading="Leads">
                                  {clientOptions
                                    .filter((o) => o.type === "lead")
                                    .map((o) => (
                                      <CommandItem
                                        key={`l-${o.value}`}
                                        value={`lead-${o.label.toLowerCase()}`}
                                        onSelect={() => { setClientId(o.value); setClientSearch(o.label); setClientOpen(false); }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", clientId === o.value ? "opacity-100" : "opacity-0")} />
                                        {o.label}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Valid for (days)</Label>
                      <Input type="number" min="1" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>GST %</Label>
                      <Input type="number" min="0" max="100" step="0.5" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Discount %</Label>
                      <Input type="number" min="0" max="100" step="0.5" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requirements, notes for client..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Terms & Conditions</Label>
                    <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {/* Products */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" /> Products
                    </CardTitle>
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) { addItem(parseInt(e.target.value)); e.target.value = ""; } }}
                      className="h-8 rounded-md border border-input bg-input px-2 text-xs"
                    >
                      <option value="">+ Add product...</option>
                      {(Array.isArray(products) ? products : []).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Select a product above to add it</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{item.productName}</p>
                          <button type="button" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Linked inventory item (optional, used for stock at SO confirm)</p>
                          <select
                            value={item.itemId ?? ""}
                            onChange={(e) => {
                              const id = e.target.value ? Number(e.target.value) : null;
                              const inv = id ? (Array.isArray(inventoryItems) ? inventoryItems : []).find((x) => x.id === id) : null;
                              setItems((prev) => prev.map((x) => x.id === item.id
                                ? {
                                    ...x,
                                    itemId: id,
                                    description: inv?.name ?? x.description,
                                    unitPrice: inv?.salePrice ?? x.unitPrice,
                                  }
                                : x));
                            }}
                            className="w-full h-7 rounded-md border border-input bg-input px-2 text-xs"
                          >
                            <option value="">— Not linked —</option>
                            {(Array.isArray(inventoryItems) ? inventoryItems : []).map((inv) => (
                              <option key={inv.id} value={inv.id}>{inv.name} ({inv.sku})</option>
                            ))}
                          </select>
                        </div>
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, description: e.target.value } : x))}
                          className="h-7 text-xs"
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Width (ft)</p>
                            <Input
                              type="number" min="0" step="0.1" placeholder="—"
                              value={item.widthFt}
                              onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, widthFt: e.target.value } : x))}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Height (ft)</p>
                            <Input
                              type="number" min="0" step="0.1" placeholder="—"
                              value={item.heightFt}
                              onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, heightFt: e.target.value } : x))}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Qty</p>
                            <Input
                              type="number" min="0.01" step="0.01"
                              value={item.quantity}
                              onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, quantity: e.target.value } : x))}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Total</p>
                            <p className="h-7 flex items-center text-xs font-semibold text-primary">{formatCurrency(calcItemTotal(item))}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          ₹{item.unitPrice.toLocaleString("en-IN")} / {item.unit}
                          {parseFloat(item.widthFt) > 0 && parseFloat(item.heightFt) > 0 && (
                            <> · {parseFloat(item.widthFt) * parseFloat(item.heightFt)} sqft</>
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Add-ons */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Puzzle className="h-4 w-4" /> Add-ons & Services
                    </CardTitle>
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) { addAddon(parseInt(e.target.value)); e.target.value = ""; } }}
                      className="h-8 rounded-md border border-input bg-input px-2 text-xs"
                    >
                      <option value="">+ Add service...</option>
                      {(Array.isArray(addons) ? addons : []).map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {addonLines.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Select a service above to add it</p>
                  ) : (
                    addonLines.map((a) => (
                      <div key={a.id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium">{a.addonName}</p>
                          <button type="button" onClick={() => removeAddon(a.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <p className="text-[10px] text-muted-foreground mb-1">Description</p>
                            <Input
                              value={a.description}
                              onChange={(e) => setAddonLines((prev) => prev.map((x) => x.id === a.id ? { ...x, description: e.target.value } : x))}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Quantity</p>
                            <Input
                              type="number" min="0.01" step="0.01"
                              value={a.quantity}
                              onChange={(e) => setAddonLines((prev) => prev.map((x) => x.id === a.id ? { ...x, quantity: e.target.value } : x))}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {formatCurrency(a.price)} × {a.quantity} = <span className="text-primary font-semibold">{formatCurrency(calcAddonTotal(a))}</span>
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Summary */}
            <div>
              <Card className="lg:sticky lg:top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quotation Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Products subtotal</span>
                      <span>{formatCurrency(itemsTotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Services subtotal</span>
                      <span>{formatCurrency(addonsTotal)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {parseFloat(discountPct) > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Discount ({discountPct}%)</span>
                        <span>−{formatCurrency(discountAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST ({taxPct}%)</span>
                      <span>+{formatCurrency(taxAmt)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-bold text-primary">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || items.length === 0}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Quotation
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/dashboard/quotations")}>
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    
  );
}
