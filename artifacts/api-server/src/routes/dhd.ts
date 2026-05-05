import { Router } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq, inArray, and, isNull } from "drizzle-orm";
import { ImportDhdTrackingBody, SyncDhdStatusesBody } from "@workspace/api-zod";
import { getWilayaCode } from "../lib/wilaya-codes.js";

const router = Router();

const PROCESSED = ["confirmed", "shipped", "out_for_delivery"] as const;
const DHD_API_BASE = "https://dhd.ecotrack.dz/api/v1";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function splitAddress(full: string): { commune: string; rest: string } {
  const idx = full.indexOf(" - ");
  if (idx === -1) return { commune: "", rest: full };
  return { commune: full.slice(0, idx).trim(), rest: full.slice(idx + 3).trim() };
}

router.get("/admin/dhd/export", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(inArray(ordersTable.status, PROCESSED as unknown as string[]));

  const headers = [
    "reference",
    "nom_client",
    "telephone",
    "telephone_2",
    "adresse",
    "commune",
    "wilaya",
    "code_wilaya",
    "montant",
    "remarque",
    "produit",
    "quantite",
    "type",
    "stop_desk",
    "stock",
    "can_open",
  ];

  const rows: string[] = [headers.join(",")];

  for (const o of orders) {
    if (o.trackingNumber) continue;
    const { commune, rest } = splitAddress(o.address);
    const fullName = `${o.firstName} ${o.lastName}`.trim();
    const remarque = [o.notes, `Produit: ${o.productName} x${o.quantity}`]
      .filter(Boolean)
      .join(" | ");
    const row = [
      `CMD-${o.id}`,
      fullName,
      o.phone,
      "",
      rest,
      commune,
      o.wilaya ?? "",
      "",
      Number(o.totalPrice).toFixed(2),
      remarque,
      o.productName,
      o.quantity,
      "1",
      "0",
      "0",
      "1",
    ].map(csvEscape).join(",");
    rows.push(row);
  }

  const csv = "\uFEFF" + rows.join("\r\n");
  const filename = `dhd-export-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.post("/admin/dhd/import-tracking", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = ImportDhdTrackingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  let updated = 0;
  const notFound: number[] = [];

  for (const item of parsed.data.items) {
    const tn = String(item.trackingNumber).trim();
    if (!tn) continue;
    const result = await db
      .update(ordersTable)
      .set({ trackingNumber: tn, status: "shipped" })
      .where(eq(ordersTable.id, item.orderId))
      .returning({ id: ordersTable.id });
    if (result.length > 0) {
      updated += 1;
    } else {
      notFound.push(item.orderId);
    }
  }

  res.json({ updated, notFound });
});

// ====== Direct API upload to DHD/Ecotrack ======

interface DhdCreateResponse {
  tracking?: string;
  tracking_id?: string;
  trackingNumber?: string;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

function extractTracking(data: DhdCreateResponse): string | null {
  const candidates = [
    data?.tracking,
    data?.tracking_id,
    data?.trackingNumber,
    (data as Record<string, unknown>)?.["tracking_number"],
    (data as Record<string, unknown>)?.["id_tracking"],
    (data as Record<string, unknown>)?.["colis"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number") return String(c);
  }
  // Sometimes API nests under data.data.tracking
  const nested = (data as Record<string, unknown>)?.["data"];
  if (nested && typeof nested === "object") {
    return extractTracking(nested as DhdCreateResponse);
  }
  return null;
}

router.post("/admin/dhd/upload-to-dhd", async (req, res) => {
  const session = (req as { session?: { isAdmin?: boolean } }).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = process.env.DHD_API_TOKEN;
  if (!token) {
    res.status(500).json({ error: "DHD_API_TOKEN not configured on server" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.status, "confirmed"),
        isNull(ordersTable.trackingNumber),
      ),
    );

  const total = orders.length;
  const uploaded: { orderId: number; trackingNumber: string }[] = [];
  const failed: { orderId: number; error: string }[] = [];

  for (const o of orders) {
    try {
      const wilayaCode = getWilayaCode(o.wilaya);
      if (!wilayaCode) {
        failed.push({ orderId: o.id, error: `ولاية غير معروفة: ${o.wilaya}` });
        continue;
      }

      const idx = (o.address || "").indexOf(" - ");
      const commune = idx === -1 ? "" : o.address.slice(0, idx).trim();
      const adresse = idx === -1 ? o.address : o.address.slice(idx + 3).trim();

      const fullName = `${o.firstName} ${o.lastName}`.trim();
      const remarque = [o.notes, `${o.productName} x${o.quantity}`]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        reference: `CMD-${o.id}`,
        nom_client: fullName,
        client: fullName,
        telephone: o.phone,
        phone: o.phone,
        adresse: adresse || o.address,
        commune,
        code_wilaya: wilayaCode,
        wilaya_id: wilayaCode,
        montant: Number(o.totalPrice),
        remarque,
        produit: o.productName,
        quantite: o.quantity,
        type_id: 1,
        type: 1,
        poids: 1,
        stop_desk: 0,
        stock: 0,
        can_open: 1,
      };

      const resp = await fetch(`${DHD_API_BASE}/create/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data: DhdCreateResponse;
      try {
        data = JSON.parse(text);
      } catch {
        failed.push({ orderId: o.id, error: `استجابة غير صالحة من DHD: ${text.slice(0, 100)}` });
        continue;
      }

      if (!resp.ok) {
        const msg = data?.message || `HTTP ${resp.status}`;
        failed.push({ orderId: o.id, error: String(msg) });
        continue;
      }

      const tracking = extractTracking(data);
      if (!tracking) {
        failed.push({ orderId: o.id, error: "لم يتم استخراج رقم التتبع من رد DHD" });
        continue;
      }

      await db
        .update(ordersTable)
        .set({ trackingNumber: tracking, status: "shipped" })
        .where(eq(ordersTable.id, o.id));

      uploaded.push({ orderId: o.id, trackingNumber: tracking });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ orderId: o.id, error: msg });
    }
  }

  res.json({
    total,
    uploaded: uploaded.length,
    failed,
    items: uploaded,
  });
});

// ====== Sync statuses from DHD platform (via browser bookmarklet) ======

router.post("/admin/dhd/sync-statuses", async (req, res) => {
  const session = (req as { session?: { isAdmin?: boolean } }).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SyncDhdStatusesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const buckets = parsed.data.statuses;
  const MAX_PER_BUCKET = 20000;
  const TRACKING_RE = /^DHD[A-Z0-9]{8,40}$/;
  const norm = (arr: string[] | undefined) =>
    [
      ...new Set(
        (arr ?? [])
          .slice(0, MAX_PER_BUCKET)
          .map((s) => String(s).trim())
          .filter((s) => TRACKING_RE.test(s)),
      ),
    ];

  // Apply in priority order — last write wins. cash_ready overrides delivered.
  const order: { status: string; tracks: string[] }[] = [
    { status: "shipped", tracks: norm(buckets.shipped) },
    { status: "out_for_delivery", tracks: norm(buckets.out_for_delivery) },
    { status: "pending_delivery", tracks: norm(buckets.pending_delivery) },
    { status: "delivered", tracks: norm(buckets.delivered) },
    { status: "cash_ready", tracks: norm(buckets.cash_ready) },
  ];

  // Track final status assignment per tracking number
  const finalAssignment = new Map<string, string>();
  for (const { status, tracks } of order) {
    for (const t of tracks) finalAssignment.set(t, status);
  }

  if (finalAssignment.size === 0) {
    res.json({ updated: 0, unmatched: [], byStatus: {} });
    return;
  }

  const allTracks = [...finalAssignment.keys()];
  const existing = await db
    .select({ id: ordersTable.id, trackingNumber: ordersTable.trackingNumber })
    .from(ordersTable)
    .where(inArray(ordersTable.trackingNumber, allTracks));

  const found = new Set(
    existing
      .map((o) => o.trackingNumber)
      .filter((t): t is string => typeof t === "string"),
  );
  const unmatched = allTracks.filter((t) => !found.has(t));

  // Group by target status to do bulk updates per status
  const groups = new Map<string, string[]>();
  for (const [track, status] of finalAssignment.entries()) {
    if (!found.has(track)) continue;
    if (!groups.has(status)) groups.set(status, []);
    groups.get(status)!.push(track);
  }

  const byStatus: Record<string, number> = {};
  let updated = 0;
  for (const [status, tracks] of groups.entries()) {
    if (tracks.length === 0) continue;
    const result = await db
      .update(ordersTable)
      .set({ status })
      .where(inArray(ordersTable.trackingNumber, tracks))
      .returning({ id: ordersTable.id });
    byStatus[status] = result.length;
    updated += result.length;
  }

  req.log?.info(
    { updated, unmatched: unmatched.length, byStatus },
    "DHD sync-statuses applied",
  );

  res.json({ updated, unmatched, byStatus });
});

export default router;
