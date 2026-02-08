import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";

export default async function handler(req, res) {
  const pageUrl = req.query.url;
  if (!pageUrl) return res.status(400).json({ ok: false, error: "missing url" });

  try {
    const browser = await playwright.chromium.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true   // <-- PAKSA BOOLEAN
});

    const context = await browser.newContext();
    const page = await context.newPage();

    const candidates = [];
    const collect = (u) => {
      const low = u.toLowerCase();
      if (
        low.includes("downloadfile") ||
        low.includes("/download") ||
        low.match(/\.(zip|rar|7z|apk|pdf)(\?|$)/)
      ) {
        candidates.push(u);
      }
    };

    page.on("request", (r) => collect(r.url()));
    page.on("response", (r) => collect(r.url()));

    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    const btn = page.getByText("Download File", { exact: false }).first();
    await btn.waitFor({ state: "visible", timeout: 20000 });

    // tunggu countdown selesai (tombol enabled)
    for (let i = 0; i < 60; i++) {
      const disabled = await btn
        .evaluate((el) => el.disabled || el.getAttribute("disabled") !== null)
        .catch(() => false);
      if (!disabled) break;
      await page.waitForTimeout(250);
    }

    let directUrl = null;

    // coba event download (kalau benar-benar trigger download)
    try {
      const dlPromise = page.waitForEvent("download", { timeout: 20000 });
      await btn.click({ timeout: 15000 });
      const dl = await dlPromise;
      directUrl = dl.url();
    } catch {
      // fallback kandidat network
    }

    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    if (!directUrl && candidates.length) directUrl = candidates[candidates.length - 1];

    await browser.close();

    if (!directUrl) {
      return res.status(422).json({
        ok: false,
        error: "direct_url_not_found",
        hint:
          "Kemungkinan tombol/flow berubah atau butuh langkah lain. Ambil direct link via 'Salin tautan' di browser lalu pakai proxy."
      });
    }

    return res.status(200).json({ ok: true, direct_url: directUrl });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "resolver_failed",
      detail: String(e?.message || e)
    });
  }
}