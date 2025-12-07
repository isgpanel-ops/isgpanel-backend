// backend/pdf/riskEkip.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* <body> içeriğini alır (prosedur.js ile aynı mantık) */
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

/* {{a.b.c}} doldurucu (prosedur.js ile aynı) */
function fillVars(tpl, data) {
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const val = key
      .split(".")
      .reduce((o, k) => (o && o[k] != null ? o[k] : ""), data);
    return val == null ? "" : String(val);
  });
}

/* Dosyayı Base64 data URI yapar (prosedur.js ile aynı) */
function fileToDataUri(absPath) {
  if (!fs.existsSync(absPath)) {
    console.warn("[RISK EKIP LOGO] Dosya bulunamadı:", absPath);
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
 * createRiskEkipPdf(pdfData?)
 * - pdfData frontend'den server.js üzerinden gelebilir (req.body)
 * - gelmezse isg_prosedur_template/data.json içindeki veriyi kullanır
 * - her zaman oluşturduğu PDF dosyasının tam yolunu döndürür (string)
 *
 * Şablon: isg_prosedur_template/templates/risk_ekip.html
 * Orada logo için:  <img src="{{panel.logoUrl}}" ... />
 */
async function createRiskEkipPdf(pdfData) {
  // proje kökü: .../isgpanel
  const projectRoot = path.join(__dirname, "..", "..");

  // şablon kökü: .../isgpanel/isg_prosedur_template
  const tplRoot = path.join(projectRoot, "isg_prosedur_template");

  const t = (f) => path.join(tplRoot, "templates", "riskekip", f);
  const cssPath = path.join(tplRoot, "styles", "prosedur.css");
  const jsonPath = path.join(tplRoot, "data.json");
  const outDir = path.join(projectRoot, "output");
  const outPdf = path.join(outDir, "risk_ekip.pdf");

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ŞABLON (tek sayfa)
  let body = readBodyOnly(t("risk_ekip.html"));

  // VERİ: data.json (varsayılan) + pdfData (frontend)
  let fileData = {};
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      fileData = raw.trim() ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("data.json okunamadı:", e);
    }
  }

  let data = {};
  if (fileData && typeof fileData === "object") {
    data = JSON.parse(JSON.stringify(fileData));
  }

  if (pdfData && typeof pdfData === "object") {
    data = {
      ...data,
      ...pdfData,
      firma: { ...(data.firma || {}), ...(pdfData.firma || {}) },
      tarihler: { ...(data.tarihler || {}), ...(pdfData.tarihler || {}) },
      kisiler: { ...(data.kisiler || {}), ...(pdfData.kisiler || {}) },
      kurumsal: { ...(data.kurumsal || {}), ...(pdfData.kurumsal || {}) },
      riskEkip: { ...(data.riskEkip || {}), ...(pdfData.riskEkip || {}) },
      panel: { ...(data.panel || {}), ...(pdfData.panel || {}) },
    };
  }

  if (!data.kurumsal) data.kurumsal = {};
  if (!data.panel) data.panel = {};

  // LOGO: Kurumsal Kimlikten gelen logo öncelikli
  const publicDir = path.join(projectRoot, "public");
  const defaultLogoPath = path.join(publicDir, "isgpanel-logo.png");

  let rawLogo =
    data.kurumsal.logoBase64 ||
    data.kurumsal.logoUrl ||
    data.kurumsal.logoSrc ||
    data.kurumsal.logoPath ||
    data.kurumsal.logo ||
    "";

  let logoDataUri = rawLogo;

  if (logoDataUri && typeof logoDataUri === "string") {
    // Eğer data: ile başlıyorsa zaten base64 (dokunma)
    if (/^data:image\//i.test(logoDataUri)) {
      // kullan
    } else if (/^https?:\/\//i.test(logoDataUri)) {
      // dış URL olabilir → puppeteer erişebiliyorsa kullan
      // (örn: CDN vs). Burada da direkt bırakıyoruz.
    } else {
      // muhtemelen "uploads/logo.png" gibi bir dosya yolu
      const abs = path.isAbsolute(logoDataUri)
        ? logoDataUri
        : path.join(publicDir, logoDataUri.replace(/^\//, ""));
      logoDataUri = fileToDataUri(abs);
    }
  }

  // Hâlâ yoksa varsayılan logo
  if (!logoDataUri) {
    logoDataUri = fileToDataUri(defaultLogoPath);
  }

  data.panel.logoUrl = logoDataUri;

  // ŞABLONU DOLDUR
  body = fillVars(body, data);

  const css = fs.readFileSync(cssPath, "utf8");
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
  <style>${css}
    img{ -webkit-print-color-adjust:exact; print-color-adjust:exact; image-rendering:auto; }
  </style></head><body>
  ${body}
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

/* Komut satırından test: node backend/pdf/riskEkip.js */
if (require.main === module) {
  createRiskEkipPdf()
    .then((p) => console.log("OK ->", p))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = createRiskEkipPdf;
module.exports.createPdf = createRiskEkipPdf;
module.exports.createRiskEkipPdf = createRiskEkipPdf;
