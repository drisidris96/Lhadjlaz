import { Router } from "express";
import { db, ordersTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateOrderBody,
  UpdateOrderStatusBody,
  GetOrderParams,
  UpdateOrderStatusParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/orders", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  res.json(
    orders.map((o) => ({
      ...o,
      totalPrice: Number(o.totalPrice),
    }))
  );
});

router.post("/orders", async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, parsed.data.productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (parsed.data.quantity < product.minOrderQty) {
    res.status(400).json({
      error: `Minimum order quantity is ${product.minOrderQty}`,
    });
    return;
  }
  const totalPrice = Number(product.price) * parsed.data.quantity;
  const [order] = await db
    .insert(ordersTable)
    .values({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      address: parsed.data.address,
      phone: parsed.data.phone,
      wilaya: parsed.data.wilaya,
      productId: parsed.data.productId,
      productName: product.name,
      quantity: parsed.data.quantity,
      totalPrice: String(totalPrice),
      status: "pending",
      notes: parsed.data.notes,
    })
    .returning();
  res.status(201).json({ ...order, totalPrice: Number(order.totalPrice) });
});

router.get("/orders/:id", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = GetOrderParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, parsed.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({ ...order, totalPrice: Number(order.totalPrice) });
});

router.put("/orders/:id", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const paramParsed = UpdateOrderStatusParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [order] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, paramParsed.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({ ...order, totalPrice: Number(order.totalPrice) });
});

export default router;
