// backend/pdf/yillikEgitimPlani.js

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const Mustache = require("mustache");

// LibreOffice yolu (gerekirse değiştir)
const SOFFICE_PATH = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

// Küçük id üretici
function makeId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

/**
 * LibreOffice (soffice) ile HTML'i PDF'e çevirir
 */
function convertToPdf(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const outDir = path.dirname(outputPath);

    const args = [
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outDir,
      inputPath,
    ];

    execFile(SOFFICE_PATH, args, (error, stdout, stderr) => {
      if (error) {
        console.error("LibreOffice convertToPdf hata:", error);
        console.error("stdout:", stdout);
        console.error("stderr:", stderr);
        return reject(error);
      }

      const generatedPdf = path.join(
        outDir,
        path.basename(inputPath).replace(/\.[^.]+$/, ".pdf")
      );

      try {
        if (generatedPdf !== outputPath && fs.existsSync(generatedPdf)) {
          fs.renameSync(generatedPdf, outputPath);
        }
      } catch (e) {
        console.error("PDF rename hatası:", e);
      }

      resolve(outputPath);
    });
  });
}

// Konu listesi
const KONULAR = [
  "İŞYERİ TEMİZLİĞİ VE DÜZENİ",
  "ÇALIŞMA MEVZUATI İLE İLGİLİ BİLGİLER",
  "ÇALIŞANLARIN YASAL HAK VE SORUMLULUKLARI",
  "İŞ KAZASI VE MESLEK HASTALIKLARINDAN DOĞAN HUKUKİ SONUÇLAR",
  "MESLEK HASTALIKLARININ SEBEPLERİ",
  "HASTALIKTAN KORUNMA PRENSİPLERİ VE KORUNMA TEKNİKLERİNİN UYGULANMASI",
  "BİYOLOJİK VE PSİKOLOJİK RİSK ETMENLERİ",
  "İLKYARDIM",
  "TÜTÜN ÜRÜNLERİNİN ZARARLARI VE PASİF ETKİLENİM",
  "KİMYASAL, FİZİKSEL VE ERGONOMİK RİSK ETMENLERİ",
  "ELLE KALDIRMA VE TAŞIMA",
  "YANGIN EĞİTİMİ",
  "İŞ EKİPMANLARININ GÜVENLİ KULLANIMI",
  "EKRANLI ARAÇLARLA ÇALIŞMA",
  "ELEKTRİK TEHLİKELERİ, RİSKLERİ VE ÖNLEMLERİ",
  "İŞYERİNDE SAĞLIK GÖZETİMİ",
  "KİŞİSEL KORUYUCU DONANIM KULLANIMI",
  "SAĞLIK VE GÜVENLİK GENEL KURALLARI VE GÜVENLİK KÜLTÜRÜ",
  "TAHLİYE VE KURTARMA",
  "DİĞER",
  "DİĞER",
  "DİĞER",
];

// Tehlike sınıfına göre toplam saat & dağılım
function getSaatDeseni(tehlikeLower) {
  if (tehlikeLower.includes("az")) {
    // Az tehlikeli: toplam 8 saat
    return { toplam: 8, pattern: [2, 2, 4] };
  }
  if (tehlikeLower.includes("çok")) {
    // Çok tehlikeli: toplam 16 saat
    return { toplam: 16, pattern: [4, 4, 8] };
  }
  if (tehlikeLower.includes("tehlikeli")) {
    // Tehlikeli: toplam 12 saat
    return { toplam: 12, pattern: [4, 4, 4] };
  }
  // Varsayılan
  return { toplam: 8, pattern: [2, 2, 4] };
}

// Hangi satırı kim verir?
function getEgitimiVerecek(no) {
  // 6,7,8: hekim (hastalıktan korunma, biyolojik/psikolojik risk, ilkyardım)
  if (no === 6 || no === 7 || no === 8) {
    return "İŞYERİ HEKİMİ";
  }
  return "İŞ GÜVENLİĞİ UZMANI";
}

// Saat desenini tabloya dağıt
function buildSatirlarHtml(pattern) {
  // Saatleri 5., 9. ve 15. satırlara dağıtıyoruz (index 4, 8, 14)
  const targetIdx = [4, 8, 14];
  let html = "";

  KONULAR.forEach((konu, idx) => {
    const no = idx + 1;
    const pIndex = targetIdx.indexOf(idx);
    const sure = pIndex === -1 ? "" : pattern[pIndex];
    const egitimiVerecek = getEgitimiVerecek(no);

    html += `
      <tr>
        <td class="text-center">${no}</td>
        <td>${konu}</td>
        <td class="text-center">${egitimiVerecek}</td>
        <td class="text-center">TÜM ÇALIŞANLAR</td>
        <td class="text-center"></td>
        <td class="text-center">${sure || ""}</td>
        <td class="text-center"></td>
      </tr>
    `;
  });

  return html;
}

// ANA FONKSİYON — server.js burayı çağırıyor
async function createYillikEgitimPlaniPdf(payload) {
  try {
    const kurumsal = payload.kurumsal || {};
    const firma = payload.firma || {};
    const tarihler = payload.tarihler || {};
    const imzalar = payload.imzalar || {};

    const tehlikeLower = (firma.tehlikeSinifi || "").toLowerCase();
    const { toplam, pattern } = getSaatDeseni(tehlikeLower);
    const satirlarHtml = buildSatirlarHtml(pattern);

    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "isg_prosedur_template",
      "templates",
      "yillikplanlar",
      "yillik_egitim_plani.html"
    );

    const template = fs.readFileSync(templatePath, "utf8");

    const view = {
  // ACİL EKİPTEKİ GİBİ PANEL NESNESİ
  panel: {
    logoUrl: kurumsal.logoUrl || "",
  },

  // İstersen yedek olsun diye düz logoUrl de bırakıyorum
  logoUrl: kurumsal.logoUrl || "",

  // Firma bilgileri
  firmaAdi: firma.firmaAdi || "",
  adres: firma.adres || "",
  nace: firma.nace || "",
  tehlikeSinifi: firma.tehlikeSinifi || "",
  sgkSicilNo: firma.sgkSicilNo || "",

  // Tarihler
  planBaslangicTr: tarihler.hazirlamaTr || "",
  planBitisTr: tarihler.gecerlilikTr || "",

  // Eğitim süresi ve satırlar
  egitimSaatToplam: toplam,
  satirlarHtml,

  // İmza isimleri
  isgUzmaniAd: imzalar.isgUzmaniAd || "",
  isYeriHekimiAd: imzalar.isYeriHekimiAd || "",
  isVerenAd: imzalar.isVerenAd || "",
};

    const finalHtml = Mustache.render(template, view);

    const tempDir = path.join(__dirname, "..", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const id = makeId();
    const tempHtmlPath = path.join(tempDir, `${id}.html`);
    const pdfPath = path.join(tempDir, `${id}.pdf`);

    fs.writeFileSync(tempHtmlPath, finalHtml, "utf8");

    // HTML → PDF
    await convertToPdf(tempHtmlPath, pdfPath);

    return pdfPath;
  } catch (err) {
    console.error("Yıllık Eğitim Planı PDF oluşturma hatası:", err);
    throw err;
  }
}

module.exports = {
  createYillikEgitimPlaniPdf,
};
