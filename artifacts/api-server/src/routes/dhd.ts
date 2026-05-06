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

// ====== Dynamic UserScript ======

function buildUserScript(origin: string): string {
  return `\
// ==UserScript==
// @name         Lhadj Laz - DHD Auto Sync
// @namespace    ${origin}/
// @version      2.1
// @description  مزامنة تلقائية لحالات DHD مع لوحة إدارة الحاج لاز كل 5 دقائق
// @match        https://platform.dhd-dz.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    ${origin}/api/dhd-sync.user.js
// @downloadURL  ${origin}/api/dhd-sync.user.js
// ==/UserScript==

(function () {
  'use strict';
  if (window.__lhadjlazAutoSync) return;
  window.__lhadjlazAutoSync = true;

  var TARGET = '${origin}/api/admin/dhd/sync-statuses';
  var INTERVAL_MS = 5 * 60 * 1000;

  // ── Status detection from endpoint URL ──────────────────────────────────
  function detectStatus(url) {
    var u = (url || '').toLowerCase();
    if (/\\/cashin\\/history|\\/cashin(?!\\/list)/.test(u)) return 'delivered';
    if (/\\/cashin\\/list|\\/cashin\\/history\\/list/.test(u)) return 'delivered';
    if (/non\\/encaisse/.test(u)) return 'cash_ready';
    if (/cashout/.test(u)) return 'cash_ready';
    if (/livr[ée]s?\\/list|\\/livres\\/|\\/livrés\\//.test(u)) return 'delivered';
    if (/cashin/.test(u)) return 'delivered';
    if (/suspendu|suspend/.test(u)) return 'pending_delivery';
    if (/stopdesk|stop.desk/.test(u)) return 'out_for_delivery';
    if (/livraison/.test(u)) return 'out_for_delivery';
    if (/valid|pret|prêt|expedition|wilaya|station|order/.test(u)) return 'shipped';
    return null;
  }

  // ── Live XHR interception ────────────────────────────────────────────────
  var liveData = {};
  var re = /DHD[A-Z0-9]{8,40}/g;

  function addTracking(status, text) {
    if (!status) return;
    if (!liveData[status]) liveData[status] = new Set();
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(text)) !== null) liveData[status].add(m[0]);
  }

  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__lhUrl = String(url || '');
    this.__lhMethod = String(method || '');
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    var url = this.__lhUrl || '';
    var method = this.__lhMethod || '';
    if (
      method.toUpperCase() === 'POST' &&
      url.indexOf('/list') !== -1 &&
      typeof body === 'string' &&
      body.indexOf('draw=') !== -1
    ) {
      var status = detectStatus(url);
      var self = this;
      var orig = this.onreadystatechange;
      this.onreadystatechange = function () {
        if (self.readyState === 4 && self.status === 200 && status) {
          try {
            var d = JSON.parse(self.responseText);
            if (d && Array.isArray(d.data) && d.data.length > 0) {
              addTracking(status, JSON.stringify(d.data));
            }
          } catch (_) {}
        }
        if (orig) orig.apply(self, arguments);
      };
    }
    return origSend.apply(this, arguments);
  };

  // ── Badge ────────────────────────────────────────────────────────────────
  var badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:2147483647;background:rgba(0,0,0,.85);color:#fff;padding:8px 14px;border-radius:8px;font:13px/1.4 -apple-system,sans-serif;direction:rtl;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);user-select:none';
  badge.textContent = '⏳ DHD: في الانتظار...';
  badge.title = 'اضغط لمزامنة فورية';
  function attach() { if (document.body) document.body.appendChild(badge); else setTimeout(attach, 300); }
  attach();
  function setBadge(text, color) { badge.textContent = text; badge.style.background = color || 'rgba(0,0,0,.85)'; }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ── Auto-click tabs to trigger DataTable loads ───────────────────────────
  async function clickAllTabs() {
    var selectors = [
      '.nav-tabs a', '.nav-pills a', 'ul.nav li a',
      'a[href*="livraison"]', 'a[href*="valid"]', 'a[href*="livre"]',
      'a[href*="suspendu"]', 'a[href*="retour"]', 'a[href*="station"]',
      'a[href*="wilaya"]', 'a[href*="stopdesk"]', 'a[href*="cashin"]',
      'a[href*="cashout"]', 'a[href*="ramassage"]', 'a[href*="preparation"]',
    ].join(',');
    var tabs = Array.from(document.querySelectorAll(selectors));
    // remove duplicates by href
    var seen = new Set();
    tabs = tabs.filter(function (t) {
      var h = t.getAttribute('href') || '';
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    });
    for (var i = 0; i < tabs.length && i < 15; i++) {
      try { tabs[i].click(); } catch (_) {}
      await sleep(1200);
    }
    await sleep(1000);
  }

  // ── Fallback direct fetch (try many URL patterns) ────────────────────────
  var FALLBACK_PATHS = {
    shipped: [
      '/valid/orders/list', '/valid/list', '/pret/list', '/pret-a-expedier/list',
      '/expedition/list', '/vers-station/list', '/station/list', '/wilaya/list',
      '/en-ramassage/list', '/preparation/list',
    ],
    out_for_delivery: [
      '/livraisons/list', '/livraison/list', '/stopdesk/list',
      '/en-livraison/list', '/en-cours/list',
    ],
    pending_delivery: [
      '/livraisons/suspendu/list', '/suspendu/list', '/suspendus/list',
    ],
    delivered: [
      '/livraison/cashin/list', '/livraison/cashin/history/list',
      '/livraison/non/encaisse/list', '/livraison/cashOut/list',
      '/livres/list', '/livraison/cashout/list',
    ],
    cash_ready: [
      '/livraison/cashOut/list', '/livraison/non/encaisse/list', '/cashout/list',
    ],
  };

  async function fetchFallback() {
    var out = {};
    var statuses = Object.keys(FALLBACK_PATHS);
    for (var si = 0; si < statuses.length; si++) {
      var s = statuses[si];
      if (!out[s]) out[s] = new Set();
      var paths = FALLBACK_PATHS[s];
      for (var pi = 0; pi < paths.length; pi++) {
        try {
          var r = await fetch('https://platform.dhd-dz.com' + paths[pi], {
            method: 'POST', credentials: 'include',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest',
              Accept: 'application/json',
            },
            body: 'draw=1&start=0&length=10000',
          });
          if (!r.ok) continue;
          var j = await r.json();
          if (!j || !Array.isArray(j.data)) continue;
          addTracking(s, JSON.stringify(j.data));
        } catch (_) {}
      }
    }
    return out;
  }

  // ── Main sync ────────────────────────────────────────────────────────────
  var running = false;
  async function syncNow() {
    if (running) return;
    running = true;
    setBadge('🔄 جاري جمع البيانات...', '#1d4ed8');

    // 1. Click tabs to trigger XHR interception
    await clickAllTabs();

    // 2. Also try direct fallback fetches
    setBadge('🔄 جاري المزامنة...', '#1d4ed8');
    await fetchFallback();

    // 3. Merge liveData into final object
    var merged = {};
    var ALL = ['shipped', 'out_for_delivery', 'pending_delivery', 'delivered', 'cash_ready'];
    var total = 0;
    for (var i = 0; i < ALL.length; i++) {
      var st = ALL[i];
      merged[st] = liveData[st] ? Array.from(liveData[st]) : [];
      total += merged[st].length;
    }

    if (total === 0) {
      setBadge('⚠️ لا توجد طلبيات DHD', '#b45309');
      running = false;
      return;
    }

    // 4. POST to our API
    try {
      var rr = await fetch(TARGET, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses: merged }),
      });
      if (!rr.ok) {
        if (rr.status === 401) setBadge('🔒 سجّل دخول الحاج لاز أولاً', '#b91c1c');
        else setBadge('❌ فشل HTTP ' + rr.status, '#b91c1c');
        running = false;
        return;
      }
      var data = await rr.json();
      var t = new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
      setBadge('✓ ' + (data.updated || 0) + ' محدّثة • ' + t, '#15803d');
    } catch (e) {
      setBadge('❌ خطأ: ' + (e.message || ''), '#b91c1c');
    } finally {
      running = false;
    }
  }

  badge.addEventListener('click', syncNow);
  setTimeout(syncNow, 3000);
  setInterval(syncNow, INTERVAL_MS);
})();
`;
}

router.get("/dhd-sync.user.js", (req, res) => {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
  const origin = `${proto}://${host}`;
  res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.send(buildUserScript(origin));
});

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

// ====== Sync statuses from DHD platform (via UserScript/Bookmarklet) ======

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

  const order: { status: string; tracks: string[] }[] = [
    { status: "shipped", tracks: norm(buckets.shipped) },
    { status: "out_for_delivery", tracks: norm(buckets.out_for_delivery) },
    { status: "pending_delivery", tracks: norm(buckets.pending_delivery) },
    { status: "delivered", tracks: norm(buckets.delivered) },
    { status: "cash_ready", tracks: norm(buckets.cash_ready) },
  ];

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
