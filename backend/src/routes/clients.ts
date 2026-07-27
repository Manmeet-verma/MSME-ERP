import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const clientsRouter = Router();
const db = () => getDb();

interface ClientDoc {
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  gstNumber?: string | null;
  notes?: string | null;
  createdById: string;
  createdAt: string;
}

function formatClient(id: string, c: ClientDoc, quotationCount = 0, totalValue = 0) {
  return {
    id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    company: c.company ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    state: c.state ?? null,
    gstNumber: c.gstNumber ?? null,
    notes: c.notes ?? null,
    quotationCount,
    totalValue,
    createdAt: c.createdAt,
  };
}

clientsRouter.get("/clients", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("clients").where("organizationId", "==", orgId).get();
  const clients = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ClientDoc) }));

  const quotSnap = await db().collection("quotations").where("organizationId", "==", orgId).get();
  const statMap = new Map<string, { count: number; total: number }>();
  for (const doc of quotSnap.docs) {
    const data = doc.data();
    const clientId = data.clientId as string;
    const total = data.total as number;
    const existing = statMap.get(clientId);
    if (existing) {
      existing.count += 1;
      existing.total += total;
    } else {
      statMap.set(clientId, { count: 1, total });
    }
  }

  res.json(
    clients.map((c) =>
      formatClient(
        c.id,
        c,
        statMap.get(c.id)?.count ?? 0,
        statMap.get(c.id)?.total ?? 0,
      ),
    ),
  );
});

clientsRouter.get("/clients/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const doc = await db().collection("clients").doc(req.params.id).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const data = doc.data() as ClientDoc;
  if (data.organizationId !== orgId) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(formatClient(doc.id, data));
});

clientsRouter.post("/clients", requireAuth, async (req, res) => {
  const { name, email, phone, company, address, city, state, gstNumber, notes } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const newClient: ClientDoc = {
    organizationId: req.user!.organizationId,
    name,
    email: email ?? null,
    phone: phone ?? null,
    company: company ?? null,
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    gstNumber: gstNumber ?? null,
    notes: notes ?? null,
    createdById: req.user!.userId,
    createdAt: new Date().toISOString(),
  };
  const ref = await db().collection("clients").add(newClient);
  await logAction(req, "CREATE", "client", ref.id, `Created client ${name}`);
  res.status(201).json(formatClient(ref.id, newClient));
});

clientsRouter.patch("/clients/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const updates: Record<string, unknown> = {};
  const fields = ["name", "email", "phone", "company", "address", "city", "state", "gstNumber", "notes"] as const;
  for (const f of fields) if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const docRef = db().collection("clients").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || (doc.data() as ClientDoc).organizationId !== orgId) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await docRef.update(updates);
  const updated = (await docRef.get()).data() as ClientDoc;
  await logAction(req, "UPDATE", "client", req.params.id);
  res.json(formatClient(req.params.id, updated));
});

clientsRouter.delete("/clients/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const docRef = db().collection("clients").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || (doc.data() as ClientDoc).organizationId !== orgId) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await docRef.delete();
  await logAction(req, "DELETE", "client", req.params.id);
  res.json({ message: "Client deleted" });
});

export default clientsRouter;
