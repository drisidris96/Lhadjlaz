import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/categories", async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.createdAt);
  res.json(cats);
});

router.post("/categories", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "اسم الفئة مطلوب" }); return;
  }
  try {
    const [cat] = await db.insert(categoriesTable).values({ name: name.trim() }).returning();
    res.status(201).json(cat);
  } catch {
    res.status(409).json({ error: "الفئة موجودة مسبقاً" });
  }
});

router.put("/categories/:id", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "اسم الفئة مطلوب" }); return;
  }
  try {
    const [cat] = await db.update(categoriesTable).set({ name: name.trim() }).where(eq(categoriesTable.id, id)).returning();
    if (!cat) { res.status(404).json({ error: "الفئة غير موجودة" }); return; }
    res.json(cat);
  } catch {
    res.status(409).json({ error: "الاسم مستخدم مسبقاً" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.json({ success: true });
});

export default router;
