import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();
const dailyReportsRouter = Router();

// Get daily reports (owner/admin see all, sales executive sees own)
dailyReportsRouter.get("/daily-reports", requireAuth, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const role = req.user!.role;
    const userId = req.user!.userId;
    const { date, userId: filterUserId } = req.query;

    let query: FirebaseFirestore.Query = db()
      .collection("dailyReports")
      .where("organizationId", "==", orgId);

    // Sales executives can only see their own reports
    if (role === "sales_executive" || role === "sales" || role === "viewer") {
      query = query.where("userId", "==", userId);
    } else if (filterUserId && typeof filterUserId === "string") {
      query = query.where("userId", "==", filterUserId);
    }

    if (date && typeof date === "string") {
      query = query.where("date", "==", date);
    }

    const snap = await query.orderBy("date", "desc").limit(100).get();
    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    } = req.body ?? {};

    if (!date) {
      res.status(400).json({ error: "date is required" });
      return;
    }

    // Check if report already exists for this user+org+date
    const existingSnap = await db()
      .collection("dailyReports")
      .where("organizationId", "==", orgId)
      .where("userId", "==", userId)
      .where("date", "==", date)
      .limit(1)
      .get();

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
      updatedAt: new Date().toISOString(),
    };

    let reportId: string;

    if (!existingSnap.empty) {
      // Update existing
      reportId = existingSnap.docs[0].id;
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

// Get daily report summary for owner dashboard (all team reports for a date)
dailyReportsRouter.get("/daily-reports-summary", requireAuth, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const { date } = req.query;

    if (!date || typeof date !== "string") {
      res.status(400).json({ error: "date query param required" });
      return;
    }

    const snap = await db()
      .collection("dailyReports")
      .where("organizationId", "==", orgId)
      .where("date", "==", date)
      .get();

    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

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
    }));

    res.json(summary);
  } catch (err) {
    console.error("Failed to fetch daily reports summary:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default dailyReportsRouter;
