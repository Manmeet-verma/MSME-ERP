"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateLead } from "@workspace/api-client-react";
import type { LeadInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const emptyForm = {
  phone: "", gstin: "", name: "", email: "", company: "", city: "", state: "",
  source: "manual" as LeadInput["source"], sourceBy: "", approxBudget: "", product: "", notes: "",
};

const SOURCES = ["manual", "indiamart", "website", "other"] as const;

const STATES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Kakinada", "Tirupati", "Anantapur", "Eluru", "Ongole", "Kadapa", "Chittoor", "Machilipatnam", "Tenali", "Proddatur", "Hindupur"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra", "Sasaram", "Hajipur", "Bettiah", "Motihari", "Samastipur"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi", "Shahdara", "Rohini", "Dwarka", "Saket", "Karol Bagh", "Connaught Place", "Janakpuri", "Lajpat Nagar", "Hauz Khas"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Nadiad", "Morbi", "Mehsana", "Bharuch", "Navsari", "Bhuj", "Palanpur"],
  "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Jind", "Rewari", "Palwal"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi", "Davanagere", "Ballari", "Tumakuru", "Shivamogga", "Raichur", "Bidar", "Hospet", "Gulbarga", "Udupi", "Hassan", "Chitradurga"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Alappuzha", "Palakkad", "Kannur", "Kottayam", "Malappuram", "Kasargod", "Pathanamthitta", "Idukki", "Wayanad", "Munnar"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Murwara", "Singrauli", "Burhanpur", "Khandwa", "Morena", "Chhindwara"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Amravati", "Malegaon", "Nanded", "Sangli", "Jalgaon", "Akola", "Latur", "Ahmednagar", "Dhule", "Chandrapur", "Parbhani", "Ichalkaranji"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Batala", "Pathankot", "Moga", "Abohar", "Malerkotla", "Khanna", "Phagwara", "Muktsar", "Barnala"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bhilwara", "Alwar", "Sikar", "Bharatpur", "Pali", "Sri Ganganagar", "Tonk", "Kishangarh", "Beawar", "Hanumangarh"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Dindigul", "Thanjavur", "Ranipet", "Sivakasi", "Karur", "Udhagamandalam"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam", "Mahbubnagar", "Mancherial", "Nalgonda", "Adilabad", "Suryapet", "Siddipet", "Miryalaguda", "Jagtial", "Jangaon"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Prayagraj", "Ghaziabad", "Noida", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Faizabad", "Jhansi", "Firozabad", "Mathura", "Muzaffarnagar", "Shahjahanpur", "Rampur"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Baharampur", "Haldia", "Krishnanagar", "Balurghat", "Raiganj", "Jalpaiguri", "Medinipur", "Cooch Behar", "Darjeeling"],
};

export default function NewLeadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const createMut = useCreateLead({
    mutation: {
      onSuccess(data) {
        toast({ title: "Lead created" });
        router.push("/dashboard/leads");
      },
      onError() { toast({ title: "Failed to create lead", variant: "destructive" }); },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone && !form.name) {
      toast({ title: "Phone number or name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name || form.phone || "",
      email: form.email || undefined,
      phone: form.phone || undefined,
      gstin: form.gstin || undefined,
      company: form.company || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      source: form.source as LeadInput["source"],
      sourceBy: form.sourceBy || undefined,
      approxBudget: form.approxBudget ? Number(form.approxBudget) : undefined,
      product: form.product || undefined,
      notes: form.notes || undefined,
    };
    createMut.mutate({ data: payload as any });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <button onClick={() => router.push("/dashboard/leads")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </button>
      <h1 className="text-2xl font-bold mb-6">New Lead</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>WhatsApp No.</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91..." />
          </div>
          <div className="space-y-2">
            <Label>GST No.</Label>
            <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as LeadInput["source"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {Object.keys(STATES).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })} disabled={!form.state}>
              <SelectTrigger><SelectValue placeholder={form.state ? "Select city" : "Select state first"} /></SelectTrigger>
              <SelectContent>
                {(STATES[form.state] ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source By</Label>
            <Input value={form.sourceBy} onChange={(e) => setForm({ ...form, sourceBy: e.target.value })} placeholder="e.g. Raman, IndiaMart" />
          </div>
          <div className="space-y-2">
            <Label>Approx Budget (₹)</Label>
            <Input type="number" value={form.approxBudget} onChange={(e) => setForm({ ...form, approxBudget: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Product interest</Label>
            <Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Product" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createMut.isPending} className="gap-2">
            {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Lead
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/leads")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
