import { useState } from "react";
import { Link } from "wouter";
import { useListLeads, useCreateLead, useDeleteLead, useSyncIndiamartLeads } from "@workspace/api-client-react";
import type { Lead, LeadInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Download, Flame, Trash2, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

const STATES: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kra Daadi", "Kurung Kumey", "Lohit", "Longding", "Lower Dibang Valley", "Lower Subansiri", "Namsai", "Papum Pare", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koraput", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Bot", "Chhota Udepur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribag", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela-Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davangere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "Jaintia Hills", "North Garo Hills", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip"],
  "Nagaland": ["Dimokhu", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Noklak", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Gujarat", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundergarh"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Shaheed Bhagat Singh Nagar", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalor", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupattur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Badaun", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Burdwan", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "North Dinajpur", "Paschim Medinipur", "Purba Medinipur", "Purulia", "South 24 Parganas", "Birbhum"],
};

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "csv", label: "CSV Import" },
  { value: "indiamart", label: "IndiaMart" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website" },
  { value: "phone", label: "Phone Call" },
  { value: "referral", label: "Referral" },
  { value: "walk-in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  phone: "", gstin: "", name: "", email: "", company: "", city: "", state: "",
  source: "manual" as LeadInput["source"], sourceBy: "", approxBudget: "", product: "", notes: "",
};

const PRIORITY_COLORS: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400 border border-red-500/30",
  warm: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  cold: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-cyan-500/15 text-cyan-400",
  contacted: "bg-blue-500/15 text-blue-400",
  qualified: "bg-green-500/15 text-green-400",
  lost: "bg-gray-500/15 text-gray-400",
  won: "bg-emerald-500/15 text-emerald-400",
};

type SortKey = "name" | "phone" | "company" | "city" | "priority" | "score" | "source" | "createdAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useListLeads();
  const leads = (data ?? [])
    .filter((l) => priorityFilter === "all" || l.priority === priorityFilter)
    .filter((l) => statusFilter === "all" || l.status === statusFilter)
    .filter((l) =>
      !search
        ? true
        : `${l.name} ${l.company ?? ""} ${l.email ?? ""} ${l.phone ?? ""} ${(l as any).sourceBy ?? ""}`.toLowerCase().includes(search.toLowerCase()),
    );

  const sorted = [...leads].sort((a, b) => {
    const aVal = String((a as any)[sortKey] ?? "").toLowerCase();
    const bVal = String((b as any)[sortKey] ?? "").toLowerCase();
    if (sortKey === "score") {
      const diff = (Number((a as any).score) || 0) - (Number((b as any).score) || 0);
      return sortDir === "asc" ? diff : -diff;
    }
    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const createMut = useCreateLead({
    mutation: {
      onSuccess() {
        toast({ title: "Lead created" });
        qc.invalidateQueries({ queryKey: ["/api/leads"] });
        setOpen(false);
        setForm(emptyForm);
      },
      onError() { toast({ title: "Failed to create lead", variant: "destructive" }); },
    },
  });
  const deleteMut = useDeleteLead({
    mutation: {
      onSuccess() {
        toast({ title: "Lead deleted" });
        qc.invalidateQueries({ queryKey: ["/api/leads"] });
      },
    },
  });
  const syncMut = useSyncIndiamartLeads({
    mutation: {
      onSuccess(d) {
        toast({ title: d.message ?? `Imported ${d.imported} leads` });
        qc.invalidateQueries({ queryKey: ["/api/leads"] });
      },
      onError(err: unknown) {
        const msg = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
        toast({ title: msg?.message ?? msg?.error ?? "IndiaMart sync failed", variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone && !form.name) {
      toast({ title: "Phone number or name is required", variant: "destructive" });
      return;
    }
    const payload: any = {
      name: form.name || form.phone || "",
      email: form.email || undefined,
      phone: form.phone || undefined,
      gstin: form.gstin || undefined,
      company: form.company || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      source: form.source,
      sourceBy: form.sourceBy || undefined,
      approxBudget: form.approxBudget || undefined,
      product: form.product || undefined,
      notes: form.notes || undefined,
    };
    createMut.mutate({ data: payload as any });
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending} className="gap-2">
            <Download className="h-4 w-4" /> Sync IndiaMart
          </Button>
          <Button size="sm" className="gap-2" onClick={() => { setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New Lead
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, GSTIN, company, source..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "hot", "warm", "cold"].map((p) => (
            <button key={p}
              onClick={() => { setPriorityFilter(p); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${priorityFilter === p ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {p}
            </button>
          ))}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground border-0"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Flame className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No leads yet. Add one or sync from IndiaMart.</p>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>
                      <span className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("phone")}>
                      <span className="flex items-center gap-1">WhatsApp No. <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">GST No.</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("company")}>
                      <span className="flex items-center gap-1">Company <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("city")}>
                      <span className="flex items-center gap-1">City <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">State</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("source")}>
                      <span className="flex items-center gap-1">Source <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Source By</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Priority</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("score")}>
                      <span className="flex items-center gap-1 justify-end">Score <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Approx Budget</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((l: Lead) => (
                    <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2">
                        <Link href={`/leads/${l.id}`}>
                          <a className="font-medium text-foreground hover:text-primary">{l.name}</a>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{l.phone || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs uppercase">{(l as any).gstin || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[160px]">{l.company || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.city || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.state || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{l.source || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{(l as any).sourceBy || "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${STATUS_COLORS[l.status] ?? STATUS_COLORS.new}`}>{l.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${PRIORITY_COLORS[l.priority]}`}>{l.priority}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{l.score}</td>
                      <td className="px-3 py-2 text-right text-xs">{(l as any).approxBudget ? formatCurrency((l as any).approxBudget) : l.budget ? formatCurrency(l.budget) : "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete lead?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate({ id: l.id })}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>WhatsApp No. *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone / WhatsApp number" /></div>
              <div>
                <Label>GST No.</Label>
                <Input
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="GSTIN (auto caps)"
                  maxLength={15}
                  style={{ textTransform: "uppercase" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name (optional)" /></div>
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Object.keys(STATES).sort().map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>City</Label>
                <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? "Select city" : "Select state first"} /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {(STATES[form.state] || []).sort().map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Source By</Label><Input value={form.sourceBy} onChange={(e) => setForm({ ...form, sourceBy: e.target.value })} placeholder="e.g. Raman, IndiaMart" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Approx Budget (₹)</Label><Input type="number" value={form.approxBudget} onChange={(e) => setForm({ ...form, approxBudget: e.target.value })} /></div>
              <div><Label>Product interest</Label><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
