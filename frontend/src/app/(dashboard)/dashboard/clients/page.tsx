"use client";

import { useState, useCallback } from "react";

import { useListClients, useCreateClient, useUpdateClient, useDeleteClient } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import type { Client } from "@workspace/api-client-react";
import ExcelExportButton from "@/components/excel-export-button";

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
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundergarh"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Shaheed Bhagat Singh Nagar", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalor", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupattur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Badaun", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Burdwan", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "North Dinajpur", "Paschim Medinipur", "Purba Medinipur", "Purulia", "South 24 Parganas"],
};

type ClientForm = {
  name: string; company: string; email: string; phone: string;
  address: string; state: string; city: string; pincode: string;
  gstNumber: string; isActive: boolean;
};
const emptyForm: ClientForm = {
  name: "", company: "", email: "", phone: "", address: "",
  state: "", city: "", pincode: "", gstNumber: "", isActive: true,
};

type ColKey = "name" | "company" | "gstNumber" | "email" | "phone" | "address" | "state" | "city" | "pincode" | "isActive" | "createdAt" | "actions";

interface ColDef {
  key: ColKey;
  label: string;
  width: string;
}

const DEFAULT_COLUMNS: ColDef[] = [
  { key: "name", label: "Company Person", width: "min-w-[160px]" },
  { key: "company", label: "Company Name", width: "min-w-[180px]" },
  { key: "gstNumber", label: "GST No.", width: "min-w-[150px]" },
  { key: "email", label: "Contact Email", width: "min-w-[180px]" },
  { key: "phone", label: "Contact Phone", width: "min-w-[130px]" },
  { key: "address", label: "Address", width: "min-w-[130px]" },
  { key: "state", label: "State", width: "min-w-[120px]" },
  { key: "city", label: "City", width: "min-w-[120px]" },
  { key: "pincode", label: "Pincode", width: "min-w-[80px]" },
  { key: "isActive", label: "Active", width: "min-w-[80px]" },
  { key: "createdAt", label: "Created", width: "min-w-[140px]" },
  { key: "actions", label: "Actions", width: "min-w-[90px]" },
];

function getCellValue(c: Client, key: ColKey, idx: number, formatDate: (d: string) => string, toggleActive: (c: Client) => void, togglePending: boolean, openEdit: (c: Client) => void, deleteMutation: any) {
  switch (key) {
    case "name": return <td key={key} className="px-3 py-2 font-medium border-r border-border">{c.name}</td>;
    case "company": return <td key={key} className="px-3 py-2 text-muted-foreground border-r border-border">{c.company || "-"}</td>;
    case "gstNumber": return <td key={key} className="px-3 py-2 font-mono text-xs uppercase border-r border-border">{c.gstNumber || "-"}</td>;
    case "email": return <td key={key} className="px-3 py-2 text-muted-foreground border-r border-border">{c.email || "-"}</td>;
    case "phone": return <td key={key} className="px-3 py-2 text-muted-foreground border-r border-border">{c.phone || "-"}</td>;
    case "address": return <td key={key} className="px-3 py-2 text-muted-foreground text-xs border-r border-border max-w-[160px] truncate">{c.address || "-"}</td>;
    case "state": return <td key={key} className="px-3 py-2 text-muted-foreground text-xs border-r border-border">{(c as any).state || "-"}</td>;
    case "city": return <td key={key} className="px-3 py-2 text-muted-foreground text-xs border-r border-border">{(c as any).city || "-"}</td>;
    case "pincode": return <td key={key} className="px-3 py-2 text-muted-foreground text-xs border-r border-border">{(c as any).pincode || "-"}</td>;
    case "isActive": {
      const active = (c as any).isActive !== false;
      return (
        <td key={key} className="px-3 py-2 text-center border-r border-border">
          <button
            onClick={() => toggleActive(c)}
            disabled={togglePending}
            title={active ? "Click to deactivate" : "Click to activate"}
            className="relative inline-flex h-[22px] w-[40px] items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
            style={{ backgroundColor: active ? "rgb(34 197 94)" : "rgb(209, 213, 219)" }}
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200"
              style={{ transform: active ? "translateX(20px)" : "translateX(3px)" }}
            />
          </button>
        </td>
      );
    }
    case "createdAt": return <td key={key} className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap border-r border-border">{formatDate(c.createdAt)}</td>;
    case "actions": return (
      <td key={key} className="px-3 py-2">
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => openEdit(c)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-colors" title="Edit client">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors" title="Delete client">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete client?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{c.name}</strong>. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate({ id: c.id })}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    );
    default: return <td key={key} className="px-3 py-2 border-r border-border" />;
  }
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [columns, setColumns] = useState<ColDef[]>(DEFAULT_COLUMNS);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListClients();
  const allClients = Array.isArray(data) ? data : [];
  const clients = search
    ? allClients.filter((c) => `${c.name} ${c.company ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${c.gstNumber ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    : allClients;

  const createMutation = useCreateClient({
    mutation: {
      onSuccess() {
        toast({ title: "Client created" });
        qc.invalidateQueries({ queryKey: ["/api/clients"] });
        setOpen(false);
        setForm(emptyForm);
      },
      onError(err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: msg ?? "Failed to create client", variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateClient({
    mutation: {
      onSuccess() {
        toast({ title: "Client updated" });
        qc.invalidateQueries({ queryKey: ["/api/clients"] });
        setOpen(false);
        setEditing(null);
      },
      onError() { toast({ title: "Failed to update client", variant: "destructive" }); },
    },
  });

  const deleteMutation = useDeleteClient({
    mutation: {
      onSuccess() {
        toast({ title: "Client deleted" });
        qc.invalidateQueries({ queryKey: ["/api/clients"] });
      },
      onError() { toast({ title: "Failed to delete client", variant: "destructive" }); },
    },
  });

  const toggleActiveMutation = useUpdateClient({
    mutation: {
      onSuccess() {
        toast({ title: "Client status updated" });
        qc.invalidateQueries({ queryKey: ["/api/clients"] });
      },
      onError() { toast({ title: "Failed to toggle status", variant: "destructive" }); },
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name: c.name,
      company: c.company ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      state: (c as any).state ?? "",
      city: (c as any).city ?? "",
      pincode: (c as any).pincode ?? "",
      gstNumber: c.gstNumber ?? "",
      isActive: (c as any).isActive !== false,
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      name: form.name.toUpperCase(),
      company: form.company.toUpperCase(),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload as any });
    } else {
      createMutation.mutate({ data: payload as any });
    }
  }

  function toggleActive(c: Client) {
    toggleActiveMutation.mutate({ id: c.id, data: { isActive: !(c as any).isActive } as any });
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  function formatDate(d: string) {
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
  }

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  return (
    <>
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Clients</h1>
            <p className="text-sm text-muted-foreground">{clients.length} clients</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ExcelExportButton
                rows={clients.map((c) => ({
                  Name: c.name, Email: c.email ?? "", Phone: c.phone ?? "", Company: c.company ?? "",
                  City: c.city ?? "", State: c.state ?? "", GST: c.gstNumber ?? "",
                  Value: c.totalValue ?? 0,
                  Quotations: c.quotationCount ?? 0, Notes: c.notes ?? "", Created: c.createdAt ?? "",
                }))}
                columns={["Name", "Email", "Phone", "Company", "City", "State", "GST", "Value", "Quotations", "Notes", "Created"]}
                filename="clients"
                amountKeys={["Value"]}
              />
            <Button size="sm" className="gap-2 shrink-0" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">Drag column headers to reorder</p>

        {/* Excel-like table */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-border">
                  <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r border-border min-w-[40px] bg-slate-200 dark:bg-slate-700">#</th>
                  {columns.map((col, idx) => (
                    <th
                      key={col.key}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                      className={`text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r border-border ${col.width} cursor-grab active:cursor-grabbing select-none transition-colors ${
                        dragIdx === idx ? "bg-primary/20 text-primary" :
                        dragOverIdx === idx ? "bg-primary/10 border-l-2 border-l-primary" :
                        "hover:bg-slate-200 dark:hover:bg-slate-700"
                      } ${col.key === "isActive" ? "text-center" : ""}`}
                      title={`Drag to reorder "${col.label}" column`}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <svg className="h-3 w-3 opacity-40 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                        </svg>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-3 py-3 border-r border-border"><Skeleton className="h-4 w-6" /></td>
                      {columns.map((col) => (
                        <td key={col.key} className="px-3 py-3 border-r border-border">
                          <Skeleton className="h-4 w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center py-16">
                      <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No clients yet</p>
                      <button onClick={openCreate} className="text-xs text-primary hover:underline mt-1">Add your first client</button>
                    </td>
                  </tr>
                ) : (
                  clients.map((c, idx) => (
                    <tr key={c.id} className={`border-b border-border/60 transition-colors ${idx % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50 dark:bg-slate-900/30"} hover:bg-primary/5`}>
                      <td className="px-3 py-2 text-muted-foreground text-xs border-r border-border bg-slate-50 dark:bg-slate-900/20">{idx + 1}</td>
                      {columns.map((col) => getCellValue(c, col.key, idx, formatDate, toggleActive, toggleActiveMutation.isPending, openEdit, deleteMutation))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isLoading && clients.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">Showing {clients.length} of {allClients.length} clients</p>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Company Person Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))}
                  required
                  placeholder="e.g. RAJESH KUMAR"
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Company Name</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value.toUpperCase() }))}
                  placeholder="e.g. ABC INDUSTRIES PVT LTD"
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>GST Number</Label>
                <Input
                  value={form.gstNumber}
                  onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                  placeholder="GSTIN (auto caps)"
                  maxLength={15}
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Full address" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v, city: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Object.keys(STATES).sort().map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? "Select city" : "Select state first"} /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {(STATES[form.state] || []).sort().map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pincode</Label>
                <Input value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} placeholder="400001" maxLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  style={{ backgroundColor: form.isActive ? "rgb(34 197 94)" : "rgb(209, 213, 219)" }}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: form.isActive ? "translateX(22px)" : "translateX(3px)" }}
                  />
                </button>
                <p className="text-xs text-muted-foreground mt-1">{form.isActive ? "Client is Active" : "Client is Inactive"}</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
