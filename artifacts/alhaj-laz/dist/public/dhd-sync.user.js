// ==UserScript==
// @name         Lhadj Laz - DHD Auto Sync
// @namespace    https://lhadjlaz.publicvm.com/
// @version      1.0
// @description  مزامنة تلقائية لحالات DHD مع لوحة إدارة الحاج لاز كل 5 دقائق
// @match        https://platform.dhd-dz.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://lhadjlaz.publicvm.com/dhd-sync.user.js
// @downloadURL  https://lhadjlaz.publicvm.com/dhd-sync.user.js
// ==/UserScript==

(function () {
  'use strict';
  if (window.__lhadjlazAutoSync) return;
  window.__lhadjlazAutoSync = true;

  var TARGET = 'https://lhadjlaz.publicvm.com/api/admin/dhd/sync-statuses';
  var INTERVAL_MS = 5 * 60 * 1000;
  var T = {
    shipped: ['/valid/orders/list'],
    out_for_delivery: ['/livraisons/list', '/stopdesk/list'],
    pending_delivery: ['/livraisons/suspendu/list'],
    delivered: ['/livraison/non/encaisse/list', '/livraison/cashOut/list', '/livraison/cashin/list', '/livraison/cashin/history/list'],
    cash_ready: ['/livraison/cashOut/list']
  };

  var badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:2147483647;background:rgba(0,0,0,.85);color:#fff;padding:8px 14px;border-radius:8px;font:13px/1.4 -apple-system,sans-serif;direction:rtl;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);user-select:none';
  badge.textContent = 'مزامنة DHD: في الانتظار...';
  badge.title = 'اضغط لمزامنة فورية';
  function setBadge(text, color) {
    badge.textContent = text;
    badge.style.background = color || 'rgba(0,0,0,.85)';
  }
  function attach() {
    if (document.body) document.body.appendChild(badge);
    else setTimeout(attach, 500);
  }
  attach();

  var running = false;
  async function syncNow() {
    if (running) return;
    running = true;
    setBadge('🔄 جاري مزامنة DHD...', '#1d4ed8');
    var out = {};
    var errs = [];
    for (var k of Object.keys(T)) {
      var all = new Set();
      for (var p of T[k]) {
        try {
          var r = await fetch('https://platform.dhd-dz.com' + p, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
            body: 'draw=1&start=0&length=10000'
          });
          if (!r.ok) { errs.push(p + ' HTTP ' + r.status); continue; }
          var j = await r.json();
          var txt = JSON.stringify(j.data || []);
          var m, re = /DHD[A-Z0-9]{12,}/g;
          while ((m = re.exec(txt)) !== null) all.add(m[0]);
        } catch (e) { errs.push(p + ' ' + e.message); }
      }
      out[k] = [...all];
    }
    var total = Object.values(out).reduce(function (s, a) { return s + a.length; }, 0);
    if (total === 0) {
      setBadge('⚠️ لا توجد طلبيات DHD' + (errs.length ? ' • ' + errs.length + ' خطأ' : ''), '#b45309');
      running = false;
      return;
    }
    try {
      var rr = await fetch(TARGET, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses: out })
      });
      if (!rr.ok) {
        if (rr.status === 401) setBadge('🔒 سجّل دخول الحاج لاز أولاً', '#b91c1c');
        else setBadge('❌ فشلت المزامنة (HTTP ' + rr.status + ')', '#b91c1c');
        running = false;
        return;
      }
      var data = await rr.json();
      var t = new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
      setBadge('✓ ' + (data.updated || 0) + ' محدّثة • ' + t, '#15803d');
    } catch (e) {
      setBadge('❌ خطأ شبكة: ' + (e.message || e), '#b91c1c');
    } finally {
      running = false;
    }
  }

  badge.addEventListener('click', syncNow);
  setTimeout(syncNow, 4000);
  setInterval(syncNow, INTERVAL_MS);
})();
