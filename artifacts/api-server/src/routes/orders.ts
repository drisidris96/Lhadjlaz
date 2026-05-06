import { Router } from "express";
import { db, ordersTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateOrderBody,
  UpdateOrderStatusBody,
  UpdateOrderInfoBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderInfoParams,
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

router.get("/orders/track/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({
    id: order.id,
    status: order.status,
    productName: order.productName,
    trackingNumber: order.trackingNumber,
    createdAt: order.createdAt,
    wilaya: order.wilaya,
    firstName: order.firstName,
  });
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

router.patch("/orders/:id", async (req, res) => {
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const paramParsed = UpdateOrderInfoParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateOrderInfoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, paramParsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.firstName !== undefined) updates.firstName = d.firstName;
  if (d.lastName !== undefined) updates.lastName = d.lastName;
  if (d.phone !== undefined) updates.phone = d.phone;
  if (d.wilaya !== undefined) updates.wilaya = d.wilaya;
  if (d.address !== undefined) updates.address = d.address;
  if (d.notes !== undefined) updates.notes = d.notes;
  if (d.quantity !== undefined) {
    updates.quantity = d.quantity;
    const newTotal = Number(existing.totalPrice) / existing.quantity * d.quantity;
    updates.totalPrice = String(newTotal);
  }

  if (Object.keys(updates).length === 0) {
    res.json({ ...existing, totalPrice: Number(existing.totalPrice) });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, paramParsed.data.id))
    .returning();
  res.json({ ...order, totalPrice: Number(order.totalPrice) });
});

export default router;
