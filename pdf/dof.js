// backend/pdf/dof.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// <body> içeriğini alan fonksiyon (prosedür ile aynı)
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

// {{a.b.c}} doldurucu
function fillVars(tpl, data) {
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const val = key
      .split(".")
      .reduce((o, k) => (o && o[k] != null ? o[k] : ""), data);
    return val == null ? "" : String(val);
  });
}

// Türkçe cümle başı büyük, sonrası küçük
function sentenceCaseTr(text) {
  if (!text) return "";
  let s = text.toLocaleLowerCase("tr-TR");
  return s.replace(
    /(^\s*|[.!?]\s+)([a-zçğıöşü])/giu,
    (m, prefix, ch) => prefix + ch.toLocaleUpperCase("tr-TR")
  );
}

// Türkçe tamamı büyük
function upperTr(text) {
  return (text || "").toLocaleUpperCase("tr-TR");
}

async function createDofPdf(pdfData) {
  const projectRoot = path.join(__dirname, "..", "..");
  const tplRoot = path.join(projectRoot, "isg_prosedur_template");

  const tplPath = path.join(tplRoot, "templates", "dof", "dof.html");
  const cssPath = path.join(tplRoot, "styles", "prosedur.css");
  const jsonPath = path.join(tplRoot, "data.json");
  const outDir = path.join(projectRoot, "output");
  const outPdf = path.join(outDir, "dof.pdf");

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let tpl = readBodyOnly(tplPath);

  // data.json (sabit bilgiler)
  let fileData = {};
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      fileData = raw.trim() ? JSON.parse(raw) : {};
    } catch {}
  }

  // 1) data.json + frontend'den gelen veri
  let data = { ...fileData, ...pdfData };

  // 2) Frontend payload'ını parçala
  const kurumsal = data.kurumsal || {};
  const firma = data.firma || {};
  const uzman = data.uzman || {};
  const form = data.form || {};

  // 3) Logo HTML
  data.logoHtml = kurumsal.logoUrl
    ? `<img src="${kurumsal.logoUrl}" style="max-height:60px;object-fit:contain;" />`
    : "";

  // 4) Firma ve uzman bilgileri
  data.firmaAdi = firma.firmaAdi || "";
  data.sgkSicilNo = firma.sgkSicilNo || "";

  // İSİMLERİ BÜYÜK YAZ
  data.uzmanAdi = upperTr(form.isgUzmani || uzman.adSoyad || "");
  data.bolumSorumlusu = upperTr(form.bolumSorumlusu || "");
  data.ilgiliBolumSorumlusu = upperTr(form.ilgiliBolumSorumlusu || "");
  data.talepEden = upperTr(form.talepEden || "");
  data.yonetimTemsilcisi = upperTr(form.yonetimTemsilcisi || "");

  // 5) Radio alanları için metin ve işaretler
  const src = form.tespitKaynak;
  data.icTetkikMark = src === "icTetkik" ? "●" : "";
  data.bolumSorumlusuMark = src === "bolumSorumlusu" ? "●" : "";
  data.yonetimTemsilcisiMark = src === "yonetimTemsilcisi" ? "●" : "";

  const tespitKaynakMap = {
    icTetkik: "İç Tetkik Sonucu",
    bolumSorumlusu: "Bölüm Sorumlusu Tarafından",
    yonetimTemsilcisi: "Yönetim Temsilcisi Tarafından",
  };

  const takipSonucuMap = {
    etkin: "Faaliyet etkin bir şekilde yerine getirilmiştir.",
    basarisiz: "Faaliyet başarısızdır.",
  };

  data.tespitKaynak =
    tespitKaynakMap[form.tespitKaynak] || form.tespitKaynakDiger || "";
  data.tespitKaynakDiger = form.tespitKaynakDiger || "";

  // 6) Form alanlarını bağla (cümle başı büyük olacaklar)
  data.tarih = form.tarih || "";
  data.kayitNo = upperTr(form.kayitNo || "");
  data.tespitBirim = upperTr(form.tespitBirim || "");

  data.tanim = sentenceCaseTr(form.tanim || "");
  data.neden = sentenceCaseTr(form.neden || "");
  data.faaliyet = sentenceCaseTr(form.faaliyet || "");

  data.planBaslangic = form.planBaslangic || "";
  data.planBitis = form.planBitis || "";
  data.gercekBaslangic = form.gercekBaslangic || "";
  data.gercekBitis = form.gercekBitis || "";
  data.takipSonucu = takipSonucuMap[form.takipSonucu] || "";
  data.yeniFaaliyetNo = form.yeniFaaliyetNo || "";

  // 7) CSS + HTML birleştir
  const css = fs.readFileSync(cssPath, "utf8");
  const html = `<!doctype html><html lang="tr"><head>
    <meta charset="utf-8"/>
    <style>${css}</style>
  </head><body>
    ${fillVars(tpl, data)}
  </body></html>`;

  // 8) PDF üret
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

  // tüm görselleri yükle
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
    margin: { top: "10mm", right: "12mm", bottom: "20mm", left: "12mm" },
  });

  await browser.close();
  return outPdf;
}

module.exports = { createDofPdf };
