/**
 * DHD platform reconnaissance script.
 * Logs in to platform.dhd-dz.com and discovers tab URLs + HTML structure
 * so we can build the auto-sync scraper.
 *
 * Run with: pnpm --filter @workspace/scripts run dhd-recon
 */

const BASE = "https://platform.dhd-dz.com";
const USER = process.env.DHD_USERNAME;
const PASS = process.env.DHD_PASSWORD;

if (!USER || !PASS) {
  console.error("Missing DHD_USERNAME or DHD_PASSWORD in env");
  process.exit(1);
}

type CookieJar = Map<string, string>;

function parseSetCookie(headers: Headers, jar: CookieJar) {
  const raw = headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) {
      const k = pair.slice(0, eq).trim();
      const v = pair.slice(eq + 1).trim();
      jar.set(k, v);
    }
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(
  url: string,
  jar: CookieJar,
  init: RequestInit & { followRedirect?: boolean } = {},
): Promise<Response> {
  const headers = new Headers(init.headers as Record<string, string> | undefined);
  if (jar.size) headers.set("Cookie", cookieHeader(jar));
  if (!headers.has("User-Agent")) {
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Linux; Android 12; Pixel) AppleWebKit/537.36 Chrome/130 Safari/537.36",
    );
  }
  const followRedirect = init.followRedirect ?? false;
  const res = await fetch(url, {
    ...init,
    headers,
    redirect: followRedirect ? "follow" : "manual",
  });
  parseSetCookie(res.headers, jar);
  return res;
}

function extract<T extends string>(html: string, re: RegExp): T | null {
  const m = html.match(re);
  return (m?.[1] as T) ?? null;
}

function extractAll(html: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = g.exec(html)) !== null) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

async function main() {
  const jar: CookieJar = new Map();

  console.log("=== STEP 1: GET login page ===");
  const loginPage = await req(`${BASE}/login`, jar);
  console.log("status:", loginPage.status, "len:", (await loginPage.clone().text()).length);
  const loginHtml = await loginPage.text();
  console.log("cookies after GET /login:", [...jar.keys()]);

  // Look for CSRF token (Laravel _token, csrf-token meta, etc.)
  const csrfMeta = extract(loginHtml, /<meta name="csrf-token" content="([^"]+)"/);
  const csrfInput = extract(loginHtml, /name="_token"[^>]*value="([^"]+)"/);
  const csrf = csrfMeta || csrfInput;
  console.log("CSRF token:", csrf ? csrf.slice(0, 20) + "..." : "(not found)");

  // Look for login form action
  const formAction = extract(loginHtml, /<form[^>]*action="([^"]+)"/);
  console.log("Login form action:", formAction);

  // Look for the field names of the login form
  const inputNames = extractAll(loginHtml, /<input[^>]*name="([^"]+)"/g);
  console.log("Input names on login page:", inputNames);

  console.log("\n=== STEP 2: POST login ===");
  // Try common Ecotrack/Laravel login fields
  const postUrl = formAction
    ? formAction.startsWith("http")
      ? formAction
      : BASE + (formAction.startsWith("/") ? formAction : "/" + formAction)
    : `${BASE}/login`;

  const body = new URLSearchParams();
  if (csrf) body.set("_token", csrf);
  body.set("email", USER!);
  body.set("username", USER!);
  body.set("login", USER!);
  body.set("password", PASS!);
  body.set("remember", "on");

  const loginRes = await req(postUrl, jar, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": `${BASE}/login`,
      "Origin": BASE,
      ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
    },
    body: body.toString(),
  });
  console.log(
    "status:",
    loginRes.status,
    "location:",
    loginRes.headers.get("location"),
  );
  console.log("cookies after POST:", [...jar.keys()]);

  // Follow redirect if present
  let dashUrl = `${BASE}/`;
  const loc = loginRes.headers.get("location");
  if (loc) {
    dashUrl = loc.startsWith("http") ? loc : BASE + (loc.startsWith("/") ? loc : "/" + loc);
  }

  console.log("\n=== STEP 3: GET dashboard ===");
  const dash = await req(dashUrl, jar, { followRedirect: true });
  const dashHtml = await dash.text();
  console.log("dashboard URL:", dash.url, "status:", dash.status, "len:", dashHtml.length);
  // Sanity: did login succeed?
  const loggedIn =
    /logout|deconnexion|déconnexion|تسجيل الخروج/i.test(dashHtml) &&
    !/password|mot de passe/i.test(dashHtml.slice(0, 5000));
  console.log("Looks logged in:", loggedIn);

  console.log("\n=== STEP 4: Extract <a href> links from dashboard ===");
  const hrefs = extractAll(dashHtml, /<a[^>]+href="([^"]+)"/g);
  // unique
  const uniq = [...new Set(hrefs)];
  console.log("Total unique hrefs:", uniq.length);
  // print interesting ones (containing dashboard, livraison, colis, en-cours, terminees, etc.)
  const interesting = uniq.filter((h) =>
    /dashboard|livraison|colis|en[-_]cours|terminee|attente|retour|center|centre|hub|menu|tab|ready|sent|pending|completed|orders/i.test(
      h,
    ),
  );
  console.log("Interesting links:");
  for (const h of interesting) console.log("  ", h);

  // Save dashboard html for inspection
  const fs = await import("node:fs/promises");
  await fs.mkdir("/tmp/dhd-recon", { recursive: true });
  await fs.writeFile("/tmp/dhd-recon/dashboard.html", dashHtml);
  console.log("\nSaved dashboard HTML to /tmp/dhd-recon/dashboard.html");

  console.log("\n=== STEP 5: Try common Ecotrack tab URLs ===");
  const guesses = [
    "/dashboard",
    "/dashboard/livraisons-en-cours",
    "/dashboard/livraisons-terminees",
    "/dashboard/livraisons-en-attente",
    "/dashboard/livraisons/en-cours",
    "/dashboard/livraisons/terminees",
    "/dashboard/livraisons/en-attente",
    "/livraisons-en-cours",
    "/livraisons-terminees",
    "/livraisons-en-attente",
    "/parcels/in-progress",
    "/parcels/completed",
    "/parcels/pending",
    "/orders",
    "/orders/in-progress",
    "/colis",
    "/colis/en-cours",
    "/colis/termines",
    "/colis/en-attente",
    "/colis/retournes",
    "/expedition/en-cours",
    "/expedition/terminees",
    "/api/orders",
    "/api/parcels",
    "/dashboard/orders",
  ];
  for (const path of guesses) {
    try {
      const r = await req(`${BASE}${path}`, jar);
      const t = await r.text();
      const has = /DHD3AAT|tracking|colis/.test(t);
      console.log(
        `  ${path.padEnd(40)} status=${r.status} len=${t.length}${has ? " HAS-CONTENT" : ""}`,
      );
      if (r.status === 200 && t.length > 1000) {
        await fs.writeFile(
          `/tmp/dhd-recon/${path.replace(/[\/]/g, "_") || "root"}.html`,
          t,
        );
      }
    } catch (e) {
      console.log(`  ${path} ERROR: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log("\n=== STEP 6: Look for AJAX/datatable endpoints in dashboard JS ===");
  // Patterns like url: '...', ajax: '...', fetch('...')
  const ajaxUrls = extractAll(
    dashHtml,
    /(?:url|ajax)\s*:\s*['"]([^'"]+)['"]/g,
  );
  const fetchUrls = extractAll(dashHtml, /fetch\(\s*['"]([^'"]+)['"]/g);
  const ax = [...new Set([...ajaxUrls, ...fetchUrls])];
  console.log("Ajax/fetch URLs found in HTML:");
  for (const u of ax) console.log("  ", u);

  console.log("\n=== DONE ===");
  console.log("HTML samples saved in /tmp/dhd-recon/");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
