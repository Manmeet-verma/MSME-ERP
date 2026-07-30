"use client";

import { useState } from "react";

import { useListClients, useCreateClient, useUpdateClient, useDeleteClient } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, Pencil, Trash2, Building2, Phone, Mail, MapPin, Calendar, ToggleLeft, ToggleRight } from "lucide-react";
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
import { MobileCard, MobileCardField, MobileCardActions } from "@/components/mobile-card";

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

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
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
      onSuccess() { qc.invalidateQueries({ queryKey: ["/api/clients"] }); },
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

  return (
    <>
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Clients</h1>
            <p className="text-sm text-muted-foreground">{clients.length} clients</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Client
          </Button>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto table-scroll-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Company Person</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Company Name</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">GST No.</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Contact Email</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Contact Phone</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">State</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">City</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Pincode</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Active</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Created</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-medium uppercase">{c.name}</td>
                    <td className="px-3 py-2 text-muted-foreground uppercase">{c.company || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs uppercase">{c.gstNumber || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.email || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.phone || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{(c as any).state || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{(c as any).city || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{(c as any).pincode || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleActive(c)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors"
                        style={((c as any).isActive !== false)
                          ? { backgroundColor: "rgb(34 197 94 / 0.15)", color: "rgb(34 197 94)" }
                          : { backgroundColor: "rgb(156 163 175 / 0.15)", color: "rgb(156 163 175)" }
                        }
                      >
                        {((c as any).isActive !== false) ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        {((c as any).isActive !== false) ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete client?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {c.name}. This cannot be undone.
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : clients.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No clients yet</p>
              <button onClick={openCreate} className="text-xs text-primary hover:underline mt-1">Add your first client</button>
            </div>
          ) : (
            clients.map((c) => (
              <MobileCard key={c.id}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm uppercase">{c.name}</p>
                    {c.company && <p className="text-xs text-muted-foreground uppercase">{c.company}</p>}
                  </div>
                  <button
                    onClick={() => toggleActive(c)}
                    className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${((c as any).isActive !== false) ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"}`}
                  >
                    {((c as any).isActive !== false) ? "Active" : "Inactive"}
                  </button>
                </div>
                <div className="space-y-1">
                  {c.email && <MobileCardField label="Email" value={c.email} />}
                  {c.phone && <MobileCardField label="Phone" value={c.phone} />}
                  {c.gstNumber && <MobileCardField label="GST" value={c.gstNumber} mono />}
                  {(c as any).state && <MobileCardField label="State" value={(c as any).state} />}
                  {(c as any).city && <MobileCardField label="City" value={(c as any).city} />}
                  {(c as any).pincode && <MobileCardField label="Pincode" value={(c as any).pincode} />}
                  {c.address && <MobileCardField label="Address" value={c.address} />}
                  <MobileCardField label="Created" value={formatDate(c.createdAt)} />
                </div>
                <MobileCardActions>
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="gap-1 flex-1">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive flex-1">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete client?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete {c.name}. This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate({ id: c.id })} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </MobileCardActions>
              </MobileCard>
            ))
          )}
        </div>

        {isLoading && (
          <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
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
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${form.isActive ? "border-green-500/40 bg-green-500/10 text-green-500" : "border-gray-400/40 bg-gray-400/10 text-gray-400"}`}
                >
                  {form.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {form.isActive ? "Active" : "Inactive"}
                </button>
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
