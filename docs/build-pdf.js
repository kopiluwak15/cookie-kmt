const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function buildPDF() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const htmlPath = path.join(__dirname, 'system-manual-book.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: path.join(__dirname, 'system-manual.pdf'),
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width:100%;font-size:8px;color:#999;padding:0 15mm;font-family:'Hiragino Kaku Gothic ProN',sans-serif;display:flex;justify-content:space-between;">
        <span></span>
        <span style="color:#b45309;">COOKIE 熊本 顧客管理システム 取扱説明書</span>
      </div>
    `,
    footerTemplate: `
      <div style="width:100%;font-size:8px;color:#999;padding:0 15mm;font-family:'Hiragino Kaku Gothic ProN',sans-serif;display:flex;justify-content:space-between;">
        <span>2026年4月13日版</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '20mm',
      right: '18mm',
    },
  });

  await browser.close();
  console.log('PDF generated: docs/system-manual.pdf');
}

buildPDF().catch(console.error);
