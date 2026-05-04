import { Router } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { ImportDhdTrackingBody } from "@workspace/api-zod";

const router = Router();

const PROCESSED = ["confirmed", "shipped", "out_for_delivery"] as const;

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

export default router;
