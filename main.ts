import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { chromium, Page } from "@playwright/test";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const screenshots = path.resolve(__dirname, "screenshots");

if (!fs.existsSync(screenshots)) {
  fs.mkdirSync(screenshots, { recursive: true });
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

let url = process.argv[2];
await page.goto(url, { waitUntil: "domcontentloaded" });

while (true) {
  const h1Content = (await page.locator("h1").innerText()).trim();
  const title = await page.title();

  if (h1Content.toLowerCase().includes("confirmation")) {
    break;
  }

  const fileName = `${title.padStart(2, "0")}-${h1Content
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")}.png`;

  await page.screenshot({
    path: path.join(screenshots, fileName),
    fullPage: true,
  });

  await enterDummyData(page);

  const continueBtn = page.getByRole("button", {
    name: /Continue|Save and continue/i,
  });

  if ((await continueBtn.count()) === 0) {
    console.log("No continue button found. Stopping...");
    break;
  }

  await Promise.all([
    page.waitForLoadState("networkidle"),
    continueBtn.first().click(),
  ]);
}

await browser.close();

const output = fs.createWriteStream(
  path.resolve(process.cwd(), "govuk-journey.zip"),
);
const archive = archiver("zip", { zlib: { level: 9 } });

try {
  archive.pipe(output);
  archive.directory(screenshots, false);
  archive.finalize();
} catch (e) {
  throw new Error(`Zip error: ${e}`);
}

console.log(`Zipped screenshots to ${screenshots}`);

async function enterDummyData(page: Page): Promise<void> {
  // Fill text inputs
  await page.$$eval('input[type="text"]', (inputs: HTMLInputElement[]) =>
    inputs.forEach((i) => (i.value = "dummy")),
  );

  // Fill email inputs
  await page.$$eval('input[type="email"]', (inputs: HTMLInputElement[]) =>
    inputs.forEach((i) => (i.value = "dummy@email.com")),
  );

  // Fill number inputs
  await page.$$eval('input[type="number"]', (inputs: HTMLInputElement[]) =>
    inputs.forEach((i) => (i.value = "123")),
  );

  // Select first radio in each named group
  await page.$$eval('input[type="radio"]', (radios: HTMLInputElement[]) => {
    const groups: Record<string, HTMLInputElement> = {};
    radios.forEach((r) => {
      const name = r.name || "__no_name__";
      if (!groups[name]) groups[name] = r;
    });
    Object.values(groups).forEach((r) => (r.checked = true));
  });

  // Check all checkboxes
  await page.$$eval('input[type="checkbox"]', (boxes: HTMLInputElement[]) =>
    boxes.forEach((b) => (b.checked = true)),
  );
}
