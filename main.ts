import { chromium, Browser, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const startUrl = process.argv[1];
const screenshotsDir = path.resolve(__dirname, 'screenshots');

async function main(): Promise<void> {
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true })
    };

    const browser: Browser = await chromium.launch();
    const context = await browser.newContext();
    const page: Page = await context.newPage();

    let url = startUrl;
    let stepCount = 1;

    await page.goto(url, { waitUntil: 'networkidle' });

    while (true) {
        await page.waitForSelector('h1', { timeout: 30_000 });
        const h1Content = (await page.locator('h1').innerText()).trim();
        const fileName = pageNameFromH1(h1Content, stepCount);
        const outPath = path.join(screenshotsDir, fileName);
        await page.screenshot({ path: outPath, fullPage: true });

        await enterDummyData(page);

        const lower = h1Content.toLowerCase();
        if (lower.includes('confirmed') || lower.includes('confirmation')) {
            break;
        }

        const continueBtn = page.getByRole('button', { name: /Continue|Save and continue/i });
        if ((await continueBtn.count()) === 0) {
            console.log('No continue button found. Stopping...');
            break;
        }

        await Promise.all([
            page.waitForLoadState('networkidle'),
            continueBtn.first().click()
        ]);

        stepCount++;
    }

    await browser.close();

    const zipPath = path.resolve(process.cwd(), 'govuk-journey.zip');
    await zipDirectory(screenshotsDir, zipPath);
    console.log(`Zipped screenshots to ${zipPath}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

function pageNameFromH1(text: string, index: number): string {
    return `${String(index).padStart(2, '0')}-${text
        .toLowerCase()
        .replace(/'/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')}.png`;
}

async function enterDummyData(page: Page): Promise<void> {
    // Fill text inputs
    await page.$$eval('input[type="text"]', (inputs: HTMLInputElement[]) =>
        inputs.forEach(i => (i.value = 'dummy'))
    );

    // Fill email inputs
    await page.$$eval('input[type="email"]', (inputs: HTMLInputElement[]) =>
        inputs.forEach(i => (i.value = 'dummy@email.com'))
    );

    // Fill number inputs
    await page.$$eval('input[type="number"]', (inputs: HTMLInputElement[]) =>
        inputs.forEach(i => (i.value = '123'))
    );

    // Select first radio in each named group
    await page.$$eval('input[type="radio"]', (radios: HTMLInputElement[]) => {
        const groups: Record<string, HTMLInputElement> = {};
        radios.forEach(r => {
            const name = r.name || '__no_name__';
            if (!groups[name]) groups[name] = r;
        });
        Object.values(groups).forEach(r => (r.checked = true));
    });

    // Check all checkboxes
    await page.$$eval('input[type="checkbox"]', (boxes: HTMLInputElement[]) =>
        boxes.forEach(b => (b.checked = true))
    );
}

async function zipDirectory(dirPath: string, outPath: string): Promise<void> {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => resolve());
        archive.on('error', err => reject(err));
        archive.pipe(output);
        archive.directory(dirPath, false);
        archive.finalize();
    });
}