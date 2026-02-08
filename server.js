import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/", (req, res) => {
  res.type("text").send("OK. Use /resolve?url=https://sfile.co/xxxx");
});

app.get("/resolve", async (req, res) => {
  const pageUrl = req.query.url;
  if (!pageUrl) return res.status(400).json({ ok: false, error: "missing url" });

  const MAX_WAIT_MS = 30000;
  const POLL_MS = 250;

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    const candidates = [];
    const collect = (u) => {
      const low = u.toLowerCase();
      if (
        low.includes("downloadfile") ||
        low.includes("/download") ||
        /\.(zip|rar|7z|apk|pdf)(\?|$)/i.test(low)
      ) {
        candidates.push(u);
      }
    };
    page.on("request", (r) => collect(r.url()));
    page.on("response", (r) => collect(r.url()));

    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    const btn = page.getByText("Download File", { exact: false }).first();
    await btn.waitFor({ state: "visible", timeout: 20000 });

    // tunggu cooldown selesai (7–8 detik aman)
    const t0 = Date.now();
    while (Date.now() - t0 < MAX_WAIT_MS) {
      const disabled = await btn
        .evaluate(el => el.disabled || el.getAttribute("disabled") !== null)
        .catch(() => false);
      if (!disabled) break;
      await page.waitForTimeout(POLL_MS);
    }

    let directUrl = null;

    // coba event download
    try {
      const dlPromise = page.waitForEvent("download", { timeout: 20000 });
      await btn.click({ timeout: 15000 });
      const dl = await dlPromise;
      directUrl = dl.url();
    } catch {
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      if (candidates.length) directUrl = candidates[candidates.length - 1];
    }

    await browser.close();

    if (!directUrl) {
      return res.status(422).json({
        ok: false,
        error: "direct_url_not_found",
        hint: "Flow berubah / popup ganggu. Coba ulang."
      });
    }

    return res.json({ ok: true, direct_url: directUrl });
  } catch (e) {
    try { if (browser) await browser.close(); } catch {}
    return res.status(500).json({ ok: false, error: "resolver_failed", detail: String(e?.message || e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("listening on", port));