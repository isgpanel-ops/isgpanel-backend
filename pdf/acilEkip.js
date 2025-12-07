// backend/pdf/acilEkip.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* <body> içeriğini alır (riskEkip/prosedur ile aynı mantık) */
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

/* Dosyayı Base64 data URI yapar (logo için) */
function fileToDataUri(absPath) {
  if (!fs.existsSync(absPath)) {
    console.warn("[ACIL EKIP LOGO] Dosya bulunamadı:", absPath);
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

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ekipleri türüne göre grupla */
function groupEkipler(list = []) {
  const groups = {
    yangin: [],
    kurtarma: [],
    koruma: [],
    ilkyardim: [],
  };

  list.forEach((row) => {
    const ek = (row.ekip || "").toUpperCase();

    if (ek.includes("İLKYARDIM") || ek.includes("İLK YARDIM")) {
      groups.ilkyardim.push(row);
    } else if (ek.includes("KURTARMA") || ek.includes("TAHLİYE")) {
      groups.kurtarma.push(row);
    } else if (ek.includes("KORUMA") || ek.includes("GÜVENLİK")) {
      groups.koruma.push(row);
    } else if (ek.includes("YANGIN")) {
      groups.yangin.push(row);
    } else {
      // tanınmayanları koruma’ya at
      groups.koruma.push(row);
    }
  });

  return groups;
}

/* tablo satırlarını HTML'e çevir */
function buildRows(rows = []) {
  if (!rows.length) {
    // tablo boş kalmasın diye 1 satır bırak
    rows = [{ adSoyad: "", gorev: "", iletisim: "" }];
  }

  return rows
    .map((r, idx) => {
      const adSoyad = escapeHtml(r.adSoyad || "");
      const gorev = escapeHtml(r.gorev || "");
      const iletisim = escapeHtml(r.iletisim || "");
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 4px; text-align: center; width: 22px;">
            ${idx + 1}
          </td>
          <td style="border: 1px solid #000; padding: 4px;">${adSoyad}</td>
          <td style="border: 1px solid #000; padding: 4px;">${gorev}</td>
          <td style="border: 1px solid #000; padding: 4px;">${iletisim}</td>
          <td style="border: 1px solid #000; padding: 4px;"></td>
        </tr>
      `;
    })
    .join("");
}

/**
 * createAcilEkipPdf(pdfData?)
 * - pdfData: frontend'den gelen req.body (kurumsal, firma, tarihler, oneriler, ekipler)
 * - Şablon: isg_prosedur_template/templates/acildurum/acil_ekip.html
 * - Dönüş: oluşturulan PDF dosyasının tam yolu (string)
 */
async function createAcilEkipPdf(pdfData) {
  // proje kökü: .../isgpanel
  const projectRoot = path.join(__dirname, "..", "..");

  // şablon kökü: .../isgpanel/isg_prosedur_template
  const tplRoot = path.join(projectRoot, "isg_prosedur_template");

  const t = (f) => path.join(tplRoot, "templates", "acildurum", f);
  const cssPath = path.join(tplRoot, "styles", "prosedur.css");
  const jsonPath = path.join(tplRoot, "data.json");
  const outDir = path.join(projectRoot, "output");
  const outPdf = path.join(outDir, "acil_durum_ekip_listesi.pdf");

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ŞABLON
  let body = readBodyOnly(t("acil_ekip.html"));

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
      kurumsal: { ...(data.kurumsal || {}), ...(pdfData.kurumsal || {}) },
      oneriler: { ...(data.oneriler || {}), ...(pdfData.oneriler || {}) },
      panel: { ...(data.panel || {}), ...(pdfData.panel || {}) },
    };
  }

  if (!data.kurumsal) data.kurumsal = {};
  if (!data.panel) data.panel = {};

  // LOGO: Kurumsal Kimlikten gelen logo öncelikli (riskEkip mantığı) :contentReference[oaicite:3]{index=3}
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
    if (/^data:image\//i.test(logoDataUri)) {
      // zaten base64
    } else if (/^https?:\/\//i.test(logoDataUri)) {
      // dış URL - puppeteer doğrudan çeker
    } else {
      // "uploads/logo.png" vb.
      const abs = path.isAbsolute(logoDataUri)
        ? logoDataUri
        : path.join(publicDir, logoDataUri.replace(/^\//, ""));
      logoDataUri = fileToDataUri(abs);
    }
  }

  if (!logoDataUri) {
    logoDataUri = fileToDataUri(defaultLogoPath);
  }

  data.panel.logoUrl = logoDataUri;

  // EKİP SATIRLARINI HAZIRLA
  const ekipler = (pdfData && pdfData.ekipler) || data.ekipler || [];
  const groups = groupEkipler(ekipler);

  const acilEkip = {
    yanginRows: buildRows(groups.yangin),
    kurtarmaRows: buildRows(groups.kurtarma),
    korumaRows: buildRows(groups.koruma),
    ilkyardimRows: buildRows(groups.ilkyardim),
    yanginOneri: pdfData?.oneriler?.yangin ?? "",
    kurtarmaOneri: pdfData?.oneriler?.kurtarma ?? "",
    korumaOneri: pdfData?.oneriler?.koruma ?? "",
    ilkyardimOneri: pdfData?.oneriler?.ilkyardim ?? "",
  };

  data.acilEkip = { ...(data.acilEkip || {}), ...acilEkip };

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

  // Görseller tam yüklensin
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

  await page.pdf({
    path: outPdf,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: "10mm", right: "10mm", bottom: "15mm", left: "10mm" },
  });

  await browser.close();
  return outPdf;
}

/* Komut satırından test: node backend/pdf/acilEkip.js */
if (require.main === module) {
  createAcilEkipPdf()
    .then((p) => console.log("OK ->", p))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = createAcilEkipPdf;
module.exports.createPdf = createAcilEkipPdf;
module.exports.createAcilEkipPdf = createAcilEkipPdf;
