import { Router } from "express";
import { db, productsTable, ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "lhadjlaz@2026";

router.post("/admin/login", async (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (
    parsed.data.username === ADMIN_USERNAME &&
    parsed.data.password === ADMIN_PASSWORD
  ) {
    (req as any).session = { isAdmin: true, username: parsed.data.username };
    res
      .cookie("admin_session", JSON.stringify({ isAdmin: true, username: parsed.data.username }), {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      })
      .json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

router.post("/admin/logout", async (req, res) => {
  res.clearCookie("admin_session").json({ success: true });
});

router.get("/admin/me", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ isAdmin: false });
    return;
  }
  res.json({ isAdmin: true, username: session.username });
});

router.get("/admin/stats", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [productCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable);
  const [orderCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable);
  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));
  const [revenueResult] = await db
    .select({ total: sql<number>`coalesce(sum(total_price::numeric), 0)::float` })
    .from(ordersTable);
  const recentOrders = await db
    .select()
    .from(ordersTable)
    .orderBy(ordersTable.createdAt)
    .limit(5);

  res.json({
    totalProducts: productCount.count,
    totalOrders: orderCount.count,
    pendingOrders: pendingCount.count,
    totalRevenue: revenueResult.total,
    recentOrders: recentOrders.map((o) => ({
      ...o,
      totalPrice: Number(o.totalPrice),
    })),
  });
});

export default router;
