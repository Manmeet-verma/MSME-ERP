import { useState } from "react";

import {
  useListClients, useListProducts, useListAddons, useListItems,
  useCreateQuotation, useAddQuotationItem, useAddQuotationAddon,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Trash2, ChevronLeft, Loader2, Package, Puzzle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: clients } = useListClients({});
  const { data: products } = useListProducts({});
  const { data: addons } = useListAddons();
  const { data: inventoryItems } = useListItems();

  const [clientId, setClientId] = useState("");
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
    const p = (products ?? []).find((x) => x.id === productId);
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
    const a = (addons ?? []).find((x) => x.id === addonId);
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
    if (!clientId) { toast({ title: "Please select a client", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Add at least one product", variant: "destructive" }); return; }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + parseInt(validDays));

    try {
      const q = await createMutation.mutateAsync({
        data: {
          clientId: parseInt(clientId),
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
      navigate(`/quotations/${qId}`);
    } catch {
      toast({ title: "Failed to create quotation", variant: "destructive" });
    }
  }

  const isSubmitting = createMutation.isPending || addItemMutation.isPending || addAddonMutation.isPending;

  return (
    
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/quotations")} className="text-muted-foreground hover:text-foreground">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Client *</Label>
                      <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm"
                        required
                      >
                        <option value="">Select client...</option>
                        {(clients ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
                        ))}
                      </select>
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
                      {(products ?? []).map((p) => (
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
                              const inv = id ? (inventoryItems ?? []).find((x) => x.id === id) : null;
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
                            {(inventoryItems ?? []).map((inv) => (
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
                        <div className="grid grid-cols-4 gap-2">
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
                      {(addons ?? []).map((a) => (
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
                        <div className="grid grid-cols-3 gap-2">
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
              <Card className="sticky top-4">
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
                  <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/quotations")}>
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
