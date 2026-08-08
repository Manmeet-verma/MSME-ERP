import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();
const dailyReportsRouter = Router();

interface CallDetail {
  customerName: string;
  phone: string;
  callType: "inbound" | "outbound";
  duration: number;
  outcome: string;
  notes: string;
  callDate: string;
}

interface QuotationDetail {
  customerName: string;
  quotationNumber: string;
  amount: number;
  products: string;
  validityDate: string;
  status: string;
  notes: string;
}

interface MeetingDetail {
  customerName: string;
  meetingDate: string;
  type: "video" | "call" | "in-person";
  agenda: string;
  attendees: string;
  notes: string;
}

interface OrderDetail {
  customerName: string;
  orderNumber: string;
  amount: number;
  products: string;
  status: string;
  notes: string;
}

interface PaymentFollowupDetail {
  customerName: string;
  invoiceNumber: string;
  amountDue: number;
  followupDate: string;
  status: string;
  notes: string;
}

interface AfterSalesFollowupDetail {
  customerName: string;
  orderReference: string;
  type: "satisfaction" | "check-in" | "support";
  notes: string;
  followupDate: string;
}

// Get daily reports (owner/admin see all, sales executive sees own)
// Supports ?date=YYYY-MM-DD for a single day or ?from=YYYY-MM-DD&to=YYYY-MM-DD for a range.
dailyReportsRouter.get("/daily-reports", requireAuth, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const role = req.user!.role;
    const userId = req.user!.userId;
    const { date, from, to, userId: filterUserId } = req.query;

    // Single-field query on organizationId (auto-indexed) to avoid requiring
    // a Firestore composite index for the date/userId ordering.
    const snap = await db()
      .collection("dailyReports")
      .where("organizationId", "==", orgId)
      .get();

    let reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Sales executives can only see their own reports
    if (role === "sales_executive" || role === "sales" || role === "viewer") {
      reports = reports.filter((r: any) => r.userId === userId);
    } else if (filterUserId && typeof filterUserId === "string") {
      reports = reports.filter((r: any) => r.userId === filterUserId);
    }

    if (date && typeof date === "string") {
      reports = reports.filter((r: any) => r.date === date);
    } else if (from && typeof from === "string" && to && typeof to === "string") {
      reports = reports.filter((r: any) => r.date >= from && r.date <= to);
    }

    reports.sort((a: any, b: any) => (b.date ?? "").localeCompare(a.date ?? ""));
    reports = reports.slice(0, 100);
    res.json(reports);
  } catch (err) {
    console.error("Failed to fetch daily reports:", err);
    res.status(500).json({ error: "Failed to fetch daily reports" });
  }
});

// Get single daily report
dailyReportsRouter.get("/daily-reports/:id", requireAuth, async (req, res) => {
  try {
    const doc = await db().collection("dailyReports").doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const data = doc.data()!;
    if (data.organizationId !== req.user!.organizationId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    res.json({ id: doc.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// Create or update daily report (upsert by org+user+date)
dailyReportsRouter.post("/daily-reports", requireAuth, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const {
      date,
      callsMade,
      quotationsSent,
      meetingsScheduled,
      ordersReceived,
      paymentReminders,
      afterSalesFollowup,
      crmChecklist,
      ordersClosed,
      pendingFollowups,
      issuesSupport,
      tomorrowPriority,
      status,
      callDetails,
      quotationDetails,
      meetingDetails,
      orderDetails,
      paymentFollowupDetails,
      afterSalesFollowupDetails,
    } = req.body ?? {};

    if (!date) {
      res.status(400).json({ error: "date is required" });
      return;
    }

    // Check if report already exists for this user+org+date
    // Single-field query to avoid requiring a Firestore composite index,
    // then filter for the exact user+date in memory.
    const existingSnap = await db()
      .collection("dailyReports")
      .where("organizationId", "==", orgId)
      .get();
    const existingDoc = existingSnap.docs.find(
      (d) => d.data().userId === userId && d.data().date === date,
    );

    const reportData = {
      organizationId: orgId,
      userId,
      date,
      callsMade: Number(callsMade) || 0,
      quotationsSent: Number(quotationsSent) || 0,
      meetingsScheduled: Number(meetingsScheduled) || 0,
      ordersReceived: Number(ordersReceived) || 0,
      paymentReminders: Number(paymentReminders) || 0,
      afterSalesFollowup: Number(afterSalesFollowup) || 0,
      crmChecklist: crmChecklist ?? {
        callsUpdated: false,
        quotationsUpdated: false,
        followupsScheduled: false,
        customerNotesUpdated: false,
        noFollowupMissed: false,
      },
      ordersClosed: ordersClosed ?? [],
      pendingFollowups: pendingFollowups ?? "",
      issuesSupport: issuesSupport ?? "",
      tomorrowPriority: tomorrowPriority ?? "",
      status: status ?? "draft",
      callDetails: Array.isArray(callDetails) ? callDetails : [],
      quotationDetails: Array.isArray(quotationDetails) ? quotationDetails : [],
      meetingDetails: Array.isArray(meetingDetails) ? meetingDetails : [],
      orderDetails: Array.isArray(orderDetails) ? orderDetails : [],
      paymentFollowupDetails: Array.isArray(paymentFollowupDetails) ? paymentFollowupDetails : [],
      afterSalesFollowupDetails: Array.isArray(afterSalesFollowupDetails) ? afterSalesFollowupDetails : [],
      updatedAt: new Date().toISOString(),
    };

    let reportId: string;

    if (existingDoc) {
      // Update existing
      reportId = existingDoc.id;
      await db().collection("dailyReports").doc(reportId).update(reportData);
      await logAction(req, "UPDATE", "dailyReport", reportId, `Updated report for ${date}`);
    } else {
      // Create new
      const docRef = await db().collection("dailyReports").add({
        ...reportData,
        createdAt: new Date().toISOString(),
      });
      reportId = docRef.id;
      await logAction(req, "CREATE", "dailyReport", reportId, `Created report for ${date}`);
    }

    res.status(201).json({ id: reportId, ...reportData });
  } catch (err) {
    console.error("Failed to save daily report:", err);
    res.status(500).json({ error: "Failed to save daily report" });
  }
});

// Submit daily report (changes status to submitted)
dailyReportsRouter.post("/daily-reports/:id/submit", requireAuth, async (req, res) => {
  try {
    const doc = await db().collection("dailyReports").doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const data = doc.data()!;
    if (data.organizationId !== req.user!.organizationId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    await db().collection("dailyReports").doc(req.params.id).update({
      status: "submitted",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logAction(req, "SUBMIT", "dailyReport", req.params.id, `Submitted report for ${data.date}`);
    res.json({ message: "Report submitted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// Delete daily report
dailyReportsRouter.delete("/daily-reports/:id", requireAuth, async (req, res) => {
  try {
    const doc = await db().collection("dailyReports").doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const data = doc.data()!;
    if (data.organizationId !== req.user!.organizationId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    // Only owner/admin or the report owner can delete
    if (req.user!.role !== "owner" && req.user!.role !== "admin" && data.userId !== req.user!.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    await db().collection("dailyReports").doc(req.params.id).delete();
    await logAction(req, "DELETE", "dailyReport", req.params.id, `Deleted report for ${data.date}`);
    res.json({ message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete report" });
  }
});

// Get daily report summary for dashboards (all team reports for a date or date range)
// Supports ?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD.
// Sales executives see only their own reports.
dailyReportsRouter.get("/daily-reports-summary", requireAuth, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const role = req.user!.role;
    const userId = req.user!.userId;
    const { date, from, to, userId: filterUserId } = req.query;

    if (!date && !(from && to)) {
      res.status(400).json({ error: "date or from+to query params required" });
      return;
    }

    // Single-field query on organizationId (auto-indexed) to avoid requiring
    // a Firestore composite index for org+date filtering.
    const snap = await db()
      .collection("dailyReports")
      .where("organizationId", "==", orgId)
      .get();

    let reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Sales executives can only see their own reports
    if (role === "sales_executive" || role === "sales" || role === "viewer") {
      reports = reports.filter((r: any) => r.userId === userId);
    } else if (filterUserId && typeof filterUserId === "string") {
      reports = reports.filter((r: any) => r.userId === filterUserId);
    }

    if (date && typeof date === "string") {
      reports = reports.filter((r: any) => r.date === date);
    } else if (from && typeof from === "string" && to && typeof to === "string") {
      reports = reports.filter((r: any) => r.date >= from && r.date <= to);
    }

    // Get user names
    const userIds = [...new Set(reports.map((r: any) => r.userId))];
    const userSnaps = await Promise.all(
      userIds.map((uid) => db().collection("users").doc(uid).get())
    );
    const userMap = new Map<string, string>();
    userSnaps.forEach((s) => {
      if (s.exists) userMap.set(s.id, s.data()!.name ?? "Unknown");
    });

    const summary = reports.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      userName: userMap.get(r.userId) ?? "Unknown",
      date: r.date,
      callsMade: r.callsMade ?? 0,
      quotationsSent: r.quotationsSent ?? 0,
      meetingsScheduled: r.meetingsScheduled ?? 0,
      ordersReceived: r.ordersReceived ?? 0,
      paymentReminders: r.paymentReminders ?? 0,
      afterSalesFollowup: r.afterSalesFollowup ?? 0,
      status: r.status ?? "draft",
      crmChecklist: r.crmChecklist ?? {},
      ordersClosed: r.ordersClosed ?? [],
      pendingFollowups: r.pendingFollowups ?? "",
      issuesSupport: r.issuesSupport ?? "",
      tomorrowPriority: r.tomorrowPriority ?? "",
      callDetails: r.callDetails ?? [],
      quotationDetails: r.quotationDetails ?? [],
      meetingDetails: r.meetingDetails ?? [],
      orderDetails: r.orderDetails ?? [],
      paymentFollowupDetails: r.paymentFollowupDetails ?? [],
      afterSalesFollowupDetails: r.afterSalesFollowupDetails ?? [],
    }));

    res.json(summary);
  } catch (err) {
    console.error("Failed to fetch daily reports summary:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default dailyReportsRouter;
