/** Visits every route and reports console errors, page errors and failed requests. */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const ROUTES = [
  "/", "/app", "/app/today", "/app/applications", "/app/pipeline", "/app/jobs",
  "/app/interviews", "/app/follow-ups", "/app/contacts", "/app/companies",
  "/app/tasks", "/app/calendar", "/app/goals", "/app/resumes", "/app/documents",
  "/app/stories", "/app/analytics", "/app/settings",
];

const ctx = await chromium.launchPersistentContext("/tmp/applyos-profile", {
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/chromium",
  args: ["--no-sandbox"],
  viewport: { width: 1440, height: 900 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

let route = "";
const problems = [];
const note = (kind, text) => {
  // A company favicon that doesn't exist is expected; the monogram covers it.
  if (text.includes("icons.duckduckgo.com")) return;
  // The generic console twin of the above. The response handler reports real ones with a URL.
  if (text.startsWith("Failed to load resource")) return;
  problems.push(`${route}  [${kind}] ${text.slice(0, 220)}`);
};
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") note(m.type(), m.text());
});
page.on("pageerror", (e) => note("pageerror", e.message));
page.on("response", (r) => {
  if (r.status() >= 400) note("http", `${r.status()} ${r.url()}`);
});

// Follow the first detail link on each list, so dynamic routes get covered too.
const DETAIL_PROBES = [
  { from: "/app/applications", selector: 'a[href^="/app/applications/"]' },
  { from: "/app/interviews", selector: 'a[href^="/app/interviews/"]' },
  { from: "/app/contacts", selector: 'a[href^="/app/contacts/"]' },
  { from: "/app/companies", selector: 'a[href^="/app/companies/"]' },
];

for (const path of ROUTES) {
  route = path;
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
}

for (const probe of DETAIL_PROBES) {
  route = `${probe.from} → detail`;
  await page.goto(`${BASE}${probe.from}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  const href = await page.locator(probe.selector).first().getAttribute("href").catch(() => null);
  if (!href) {
    console.log(`(no detail link found on ${probe.from})`);
    continue;
  }
  route = href;
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
}

console.log(problems.length === 0 ? "CLEAN - no errors on any route" : problems.join("\n"));
await ctx.close();
