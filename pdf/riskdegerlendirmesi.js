// backend/pdf/riskdegerlendirmesi.js
const fs = require("fs");
const path = require("path");
const htmlPdf = require("html-pdf-node");

// ============== Yardımcılar ==============

function rdsClass(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "";
  if (v >= 16) return "rds-highest";
  if (v >= 12) return "rds-high";
  if (v >= 6) return "rds-medium";
  return "rds-low";
}

function joinMaybeArray(v) {
  if (Array.isArray(v)) return v.join(", ");
  if (v === null || v === undefined) return "";
  return String(v);
}

// JSX'teki satır yapısına göre <tr> üret
function buildRows(rows = []) {
  return rows
    .map((r, index) => {
      const no = r.no ?? index + 1;
      const etki = joinMaybeArray(r.etkiAlani);
      const md = joinMaybeArray(r.mevcutDurum);
      const sr = joinMaybeArray(r.sorumlu);

      const rdsCls = rdsClass(r.rds);
      const rdsSonCls = rdsClass(r.rdsSon);

      return `
<tr>
  <td>${no}</td>
  <td>${r.bolum || ""}</td>
  <td>${r.faaliyet || ""}</td>
  <td>${r.tehlike || ""}</td>
  <td>${r.risk || ""}</td>
  <td>${r.sonuc || ""}</td>
  <td>${etki}</td>
  <td style="text-align:center;">${r.olasilik ?? ""}</td>
  <td style="text-align:center;">${r.siddet ?? ""}</td>
  <td style="text-align:center;" class="${rdsCls}">${r.rds ?? ""}</td>
  <td>${r.riskTanimi || ""}</td>
  <td>${r.onlemler || ""}</td>
  <td>${md}</td>
  <td>${sr}</td>
  <td>${r.termin || ""}</td>
  <td style="text-align:center;">${r.olasilikSon ?? ""}</td>
  <td style="text-align:center;">${r.siddetSon ?? ""}</td>
  <td style="text-align:center;" class="${rdsSonCls}">${r.rdsSon ?? ""}</td>
</tr>`;
    })
    .join("\n");
}

// HTML şablonunu okuyup {{...}} alanlarını doldurur
function renderHtml(data) {
  const templatePath = path.join(
    __dirname,
    "..",
    "..",
    "isg_prosedur_template",
    "templates",
    "riskdegerlendirmesi",
    "riskdegerlendirmesi.html"
  );

  let html = fs.readFileSync(templatePath, "utf8");

  const replacements = {
    "{{logoUrl}}": data.logoUrl || "",
    "{{firmaAdi}}": data.firmaAdi || "",
    "{{tehlikeSinifi}}": data.tehlikeSinifi || "",
    "{{hazirlamaTarihi}}": data.hazirlamaTarihi || "",
    "{{gecerlilikTarihi}}": data.gecerlilikTarihi || "",
    "{{revizyonNo}}": data.revizyonNo || "",
    "{{revizyonTarihi}}": data.revizyonTarihi || "",
    "{{sgkSicilNo}}": data.sgkSicilNo || "",
    "{{rows}}": buildRows(data.rows || []),

    "{{isverenIsim}}": data.isverenIsim || "Ad - Soyad / İmza",
    "{{uzmanIsim}}": data.uzmanIsim || "Ad - Soyad / İmza",
    "{{hekimIsim}}": data.hekimIsim || "Ad - Soyad / İmza",
    "{{temsilciIsim}}": data.temsilciIsim || "Ad - Soyad / İmza",
    "{{destekIsim}}": data.destekIsim || "Ad - Soyad / İmza",
    "{{bilgiIsim}}": data.bilgiIsim || "Ad - Soyad / İmza"
  };

  for (const [token, value] of Object.entries(replacements)) {
    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    html = html.replace(re, String(value));
  }

  return html;
}

// ============== Asıl PDF fonksiyonu ==============

async function createRiskDegerlendirmesiPdf(data) {
  const html = renderHtml(data);

  const file = { content: html };

  // Burada A4 yatay boyutu net veriyoruz, marjin yok
  const options = {
    width: "297mm",
    height: "210mm",
    margin: {
      top: "0mm",
      right: "0mm",
      bottom: "0mm",
      left: "0mm"
    },
    printBackground: true
  };

  const pdfBuffer = await htmlPdf.generatePdf(file, options);

  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outPath = path.join(
    outputDir,
    `riskdegerlendirmesi_${Date.now()}.pdf`
  );

  fs.writeFileSync(outPath, pdfBuffer);

  return outPath;
}

module.exports = {
  createRiskDegerlendirmesiPdf
};
