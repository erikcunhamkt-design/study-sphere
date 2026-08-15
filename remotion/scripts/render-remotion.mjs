import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
  openBrowser,
} from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

try {
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "main",
    puppeteerInstance: browser,
  });

  console.log("Starting render...");

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: "/mnt/documents/dominus-promo.mp4",
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });

  console.log("Render complete: /mnt/documents/dominus-promo.mp4");
} catch (e) {
  console.error("Render failed:", e);
} finally {
  await browser.close({ silent: false });
}
