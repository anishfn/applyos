/**
 * Visual QA harness. Uses a persistent profile so the seeded IndexedDB
 * workspace survives between runs.
 *
 *   bun run scripts/qa.mjs seed
 *   bun run scripts/qa.mjs shot /app dashboard [width] [height] [full]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PROFILE = process.env.PROFILE ?? "/tmp/applyos-profile";
const OUT = "/tmp/applyos-shots";
mkdirSync(OUT, { recursive: true });

const [, , command, ...args] = process.argv;

const launch = (width, height, dark = true) =>
  chromium.launchPersistentContext(PROFILE, {
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: dark ? "dark" : "light",
  });

const attachLogs = (page, logs) => {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (error) => logs.push(`[pageerror] ${error.message}`));
};

if (command === "seed") {
  const context = await launch(1440, 960);
  const page = context.pages()[0] ?? (await context.newPage());
  const logs = [];
  attachLogs(page, logs);
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  // Wait for the store to finish loading before deciding whether to seed.
  await page.waitForTimeout(2500);
  const button = page.getByRole("button", { name: "Load demo workspace" });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await page.waitForTimeout(3000);
    console.log("seeded");
  } else {
    console.log("already seeded");
  }
  console.log(logs.join("\n") || "(no errors)");
  await context.close();
  process.exit(0);
}

if (command === "shot") {
  const [route, name, w = "1440", h = "960", full = "0", theme = "dark"] = args;
  const context = await launch(Number(w), Number(h), theme !== "light");
  // The app reads its theme from localStorage, so set it before the page loads.
  await context.addInitScript((mode) => {
    try { window.localStorage.setItem("applyos-theme", mode); } catch {}
  }, theme === "light" ? "light" : "dark");
  const page = context.pages()[0] ?? (await context.newPage());
  const logs = [];
  attachLogs(page, logs);
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  // Hide the Next.js dev overlay so it never lands in a screenshot.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: full === "1" });
  console.log(path);
  console.log(logs.slice(0, 25).join("\n") || "(no errors)");
  await context.close();
  process.exit(0);
}

console.log("usage: qa.mjs seed | qa.mjs shot <route> <name> [w] [h] [full] [theme]");
process.exit(1);
