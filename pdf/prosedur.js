// backend/pdf/prosedur.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* <body> içeriğini alır */
function readBodyOnly(filePath) {
  let html = fs.readFileSync(filePath, "utf8").trim();
  const s = html.search(/<body[^>]*>/i),
    e = html.search(/<\/body>/i);
  if (s !== -1 && e !== -1 && e > s) {
    return html
      .slice(s)
      .replace(/^[\s\S]*?<body[^>]*>/i, "")
      .replace(/<\/body>[\s\S]*$/i, "")
      .trim();
  }
  return html;
}

/* {{a.b.c}} doldurucu */
function fillVars(tpl, data) {
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const val = key
      .split(".")
      .reduce((o, k) => (o && o[k] != null ? o[k] : ""), data);
    return val == null ? "" : String(val);
  });
}

/* Dosyayı Base64 data URI yapar */
function fileToDataUri(absPath) {
  if (!fs.existsSync(absPath)) {
    console.warn("[ALT LOGO] Dosya bulunamadı:", absPath);
    return "";
  }
  const ext = path.extname(absPath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg"
      ? "image/jpeg"
      : ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".svg"
      ? "image/svg+xml"
      : "application/octet-stream";
  const buf = fs.readFileSync(absPath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * createPdf(pdfData?)
 * - pdfData panelden server.js üzerinden gelebilir (req.body)
 * - gelmezse isg_prosedur_template/data.json içindeki veriyi kullanır
 * - her zaman oluşturduğu PDF dosyasının tam yolunu döndürür (string)
 */
async function createPdf(pdfData) {
  // proje kökü: .../isgpanel
  const projectRoot = path.join(__dirname, "..", "..");

  // şablon kökü: .../isgpanel/isg_prosedur_template
  const tplRoot = path.join(projectRoot, "isg_prosedur_template");

  const t = (f) => path.join(tplRoot, "templates", "prosedur", f);
  const cssPath = path.join(tplRoot, "styles", "prosedur.css");
  const jsonPath = path.join(tplRoot, "data.json");
  const outDir = path.join(projectRoot, "output");
  const outPdf = path.join(outDir, "prosedur.pdf");

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ŞABLONLAR
  let kapak = readBodyOnly(t("kapak.html"));
  let sayfa1 = readBodyOnly(t("sayfa1.html"));
  let sayfa2 = readBodyOnly(t("sayfa2.html"));
  let sayfa3 = readBodyOnly(t("sayfa3.html"));
  let sayfa4 = readBodyOnly(t("sayfa4.html"));
  let sayfa5 = readBodyOnly(t("sayfa5.html"));
  let sayfa6 = readBodyOnly(t("sayfa6.html"));
  let sayfa7 = readBodyOnly(t("sayfa7.html"));
  let sayfa8 = readBodyOnly(t("sayfa8.html"));
  let sayfa9 = readBodyOnly(t("sayfa9.html"));
  let sayfa10 = readBodyOnly(t("sayfa10.html"));
  let sayfa11 = readBodyOnly(t("sayfa11.html"));
  let sayfa12 = readBodyOnly(t("sayfa12.html"));
  let sayfa13 = readBodyOnly(t("sayfa13.html"));
  let sayfa14 = readBodyOnly(t("sayfa14.html"));
  let sayfa15 = readBodyOnly(t("sayfa15.html"));
  let sayfa16 = readBodyOnly(t("sayfa16.html"));
  let sayfa17 = readBodyOnly(t("sayfa17.html"));
  let sayfa18 = readBodyOnly(t("sayfa18.html"));
  let sayfa19 = readBodyOnly(t("sayfa19.html"));

  // VERİYİ HAZIRLA
  let fileData = {};
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      fileData = raw.trim() ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("data.json okunamadı:", e);
    }
  }

  // pdfData (server.js'ten gelen) öncelikli; yoksa data.json
  let data = {};
  if (fileData && typeof fileData === "object") {
    data = JSON.parse(JSON.stringify(fileData));
  }
  if (pdfData && typeof pdfData === "object") {
    // yüzeysel merge (gelen verilerle üstüne yaz)
    data = {
      ...data,
      ...pdfData,
      kurumsal: { ...(data.kurumsal || {}), ...(pdfData.kurumsal || {}) },
      panel: { ...(data.panel || {}), ...(pdfData.panel || {}) },
    };
  }

  if (!data.kurumsal) data.kurumsal = {};
  if (!data.panel) data.panel = {};

  // ALT SABİT LOGO: proje/public/isgpanel-logo.png → Base64 (yoksa demo)
  const publicDir = path.join(projectRoot, "public");
  const altLogoPath = path.join(publicDir, "isgpanel-logo.png");

  let altLogoDataUri = fileToDataUri(altLogoPath);

  if (!altLogoDataUri) {
    console.warn(
      "[ALT LOGO] PNG bulunamadı, DEMO LOGO kullanılacak:",
      altLogoPath
    );
    const demoSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="24">
        <rect width="120" height="24" fill="#0a2b45"/>
        <text x="50%" y="50%" fill="#ffffff" font-size="10"
              font-family="Arial" dominant-baseline="middle"
              text-anchor="middle">İSG PANEL</text>
      </svg>
    `;
    altLogoDataUri =
      "data:image/svg+xml;base64," +
      Buffer.from(demoSvg, "utf8").toString("base64");
  }

  data.panel.logoUrl = altLogoDataUri;

  // ŞABLONLARI DOLDUR
  kapak = fillVars(kapak, data);
  sayfa1 = fillVars(sayfa1, data);
  sayfa2 = fillVars(sayfa2, data);
  sayfa3 = fillVars(sayfa3, data);
  sayfa4 = fillVars(sayfa4, data);
  sayfa5 = fillVars(sayfa5, data);
  sayfa6 = fillVars(sayfa6, data);
  sayfa7 = fillVars(sayfa7, data);
  sayfa8 = fillVars(sayfa8, data);
  sayfa9 = fillVars(sayfa9, data);
  sayfa10 = fillVars(sayfa10, data);
  sayfa11 = fillVars(sayfa11, data);
  sayfa12 = fillVars(sayfa12, data);
  sayfa13 = fillVars(sayfa13, data);
  sayfa14 = fillVars(sayfa14, data);
  sayfa15 = fillVars(sayfa15, data);
  sayfa16 = fillVars(sayfa16, data);
  sayfa17 = fillVars(sayfa17, data);
  sayfa18 = fillVars(sayfa18, data);
  sayfa19 = fillVars(sayfa19, data);

  const css = fs.readFileSync(cssPath, "utf8");
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
  <style>${css}
    img{ -webkit-print-color-adjust:exact; print-color-adjust:exact; image-rendering:auto; }
  </style></head><body>
  ${kapak}
  ${sayfa1}
  ${sayfa2}
  ${sayfa3} 
  ${sayfa4}
  ${sayfa5}
  ${sayfa6}
  ${sayfa7}
  ${sayfa8}
  ${sayfa9}
  ${sayfa10}
  ${sayfa11}
  ${sayfa12}
  ${sayfa13}
  ${sayfa14}
  ${sayfa15}
  ${sayfa16}
  ${sayfa17}
  ${sayfa18}
  ${sayfa19}

  </body></html>`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-web-security",
      "--allow-file-access-from-files",
    ],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });

  // Tüm görseller yüklensin
  await page.evaluate(async () => {
    const imgs = Array.from(document.images || []);
    await Promise.all(
      imgs.map((img) => {
        const p = img.decode
          ? img.decode().catch(() => {})
          : img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = img.onerror = () => res();
            });
        return p;
      })
    );
  });

  // PDF OLUŞTURMA
  await page.pdf({
    path: outPdf,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: "10mm", right: "12mm", bottom: "20mm", left: "12mm" },
  });

  await browser.close();
  return outPdf;
}

/**
 * createRiskEkipPdf(pdfData?)
 * - Risk Değerlendirme EKİBİ ATAMA YAZISI için tek sayfalık PDF üretir
 * - Şablon: isg_prosedur_template/templates/risk_ekip.html
 * - Çıktı:  isgpanel/output/risk_ekip.pdf
 * - data.json + pdfData (req.body) birleştirilerek doldurulur
 */
async function createRiskEkipPdf(pdfData) {
  // proje kökü: .../isgpanel
  const projectRoot = path.join(__dirname, "..", "..");

  // şablon kökü: .../isgpanel/isg_prosedur_template
  const tplRoot = path.join(projectRoot, "isg_prosedur_template");

  const templatePath = path.join(tplRoot, "templates", "risk_ekip.html");
  const cssPath = path.join(tplRoot, "styles", "prosedur.css");
  const jsonPath = path.join(tplRoot, "data.json");
  const outDir = path.join(projectRoot, "output");
  const outPdf = path.join(outDir, "risk_ekip.pdf");

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ŞABLON (sadece <body> içi)
  let tpl = readBodyOnly(templatePath);

  // VERİYİ HAZIRLA
  let fileData = {};
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      fileData = raw.trim() ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("data.json okunamadı (risk_ekip):", e);
    }
  }

  // pdfData (server.js'ten gelen) öncelikli; yoksa data.json
  let data = {};
  if (fileData && typeof fileData === "object") {
    data = JSON.parse(JSON.stringify(fileData));
  }
  if (pdfData && typeof pdfData === "object") {
    data = {
      ...data,
      ...pdfData,
      kurumsal: { ...(data.kurumsal || {}), ...(pdfData.kurumsal || {}) },
      panel: { ...(data.panel || {}), ...(pdfData.panel || {}) },
      riskEkip: { ...(data.riskEkip || {}), ...(pdfData.riskEkip || {}) },
    };
  }

  if (!data.kurumsal) data.kurumsal = {};
  if (!data.panel) data.panel = {};
  if (!data.riskEkip) data.riskEkip = {};

  // ALT SABİT LOGO: proje/public/isgpanel-logo.png → Base64 (yoksa demo)
  const publicDir = path.join(projectRoot, "public");
  const altLogoPath = path.join(publicDir, "isgpanel-logo.png");

  let altLogoDataUri = fileToDataUri(altLogoPath);

  if (!altLogoDataUri) {
    console.warn(
      "[ALT LOGO] PNG bulunamadı, DEMO LOGO kullanılacak (risk_ekip):",
      altLogoPath
    );
    const demoSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="24">
        <rect width="120" height="24" fill="#0a2b45"/>
        <text x="50%" y="50%" fill="#ffffff" font-size="10"
              font-family="Arial" dominant-baseline="middle"
              text-anchor="middle">İSG PANEL</text>
      </svg>
    `;
    altLogoDataUri =
      "data:image/svg+xml;base64," +
      Buffer.from(demoSvg, "utf8").toString("base64");
  }

  // Hem eski-gelecek uyumu için birkaç farklı alana yazıyoruz:
  data.panel.logoUrl = altLogoDataUri;
  data.firmaLogo = altLogoDataUri; // istersen {{firmaLogo}} kullanırsın
  data.riskEkip.logoUrl = altLogoDataUri;

  // Tarih: riskEkip.yaziTarihi yoksa tarihler.hazirlamaTr → yoksa boş
  if (!data.riskEkip.yaziTarihi) {
    if (data.tarihler && data.tarihler.hazirlamaTr) {
      data.riskEkip.yaziTarihi = data.tarihler.hazirlamaTr;
    } else {
      data.riskEkip.yaziTarihi = "";
    }
  }

  // ŞABLONU DOLDUR
  const filled = fillVars(tpl, data);

  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
  <style>${css}
    img{ -webkit-print-color-adjust:exact; print-color-adjust:exact; image-rendering:auto; }
  </style></head><body>
  ${filled}
  </body></html>`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-web-security",
      "--allow-file-access-from-files",
    ],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });

  // Tüm görseller yüklensin
  await page.evaluate(async () => {
    const imgs = Array.from(document.images || []);
    await Promise.all(
      imgs.map((img) => {
        const p = img.decode
          ? img.decode().catch(() => {})
          : img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = img.onerror = () => res();
            });
        return p;
      })
    );
  });

  // PDF OLUŞTURMA
  await page.pdf({
    path: outPdf,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: "10mm", right: "12mm", bottom: "20mm", left: "12mm" },
  });

  await browser.close();
  return outPdf;
}

/* Komut satırından direkt çalıştırmak istersen: node backend/pdf/prosedur.js */
if (require.main === module) {
  createPdf()
    .then((p) => console.log("OK ->", p))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

// Varsayılan export: createPdf (prosedür)
// Ek export: createRiskEkipPdf (ekip atama yazısı)
module.exports = createPdf;
module.exports.createPdf = createPdf;
module.exports.createRiskEkipPdf = createRiskEkipPdf;
