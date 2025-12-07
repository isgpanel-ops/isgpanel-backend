// ----------------------------------------------------------
//  SERVER.JS — TÜM PDF SİSTEMLERİ + AUTH SİSTEMİ
// ----------------------------------------------------------

require("dotenv").config(); // 🔹 ENV DEĞİŞKENLERİNİ OKU

const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");              // 🔹 EKLENDİ
const authRoutes = require("./routes/auth");       // 🔹 EKLENDİ

const app = express();

// Body Parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ----------------------------------------------------------
//  CORS AYARI (LOKAL + PROD FRONTEND)
// ----------------------------------------------------------

const allowedOrigins = [
  "http://localhost:5173",                                         // lokal geliştirme
  process.env.FRONTEND_URL || "https://senin-frontend-adresin.vercel.app" // prod frontend (env'den okunur)
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ----------------------------------------------------------
//  MONGODB BAĞLANTISI (AUTH İÇİN)
// ----------------------------------------------------------

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/isgpanelAuth";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB bağlandı (Auth)"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));

// ----------------------------------------------------------
//  AUTH ROUTES
// ----------------------------------------------------------

app.use("/api/auth", authRoutes); // 🔹 /api/auth/register ve /api/auth/login

// ----------------------------------------------------------
// PDF FONKSİYONLARI (MEVCUTLARIN HEPSİ KORUNDU)
// ----------------------------------------------------------

const { createPdf } = require("./pdf/prosedur"); // Prosedür PDF
const { createRiskEkipPdf } = require("./pdf/riskEkip"); // Risk ekibi PDF
const { createDofPdf } = require("./pdf/dof"); // DÖF PDF
const {
  createRiskDegerlendirmesiPdf,
} = require("./pdf/riskdegerlendirmesi"); // RD PDF
const { createAcilEkipPdf } = require("./pdf/acilEkip"); // Acil ekip PDF

// 🆕 YILLIK EĞİTİM PLANI PDF
const { createYillikEgitimPlaniPdf } = require("./pdf/yillikEgitimPlani");

// ----------------------------------------------------------
//  ACİL DURUM EKİPLERİ
// ----------------------------------------------------------

app.post(
  ["/api/pdf/acil-ekipleri", "/api/acil-ekipleri/pdf"],
  async (req, res) => {
    try {
      const payload = req.body || {};
      const pdfPath = await createAcilEkipPdf(payload);

      res.setHeader("Content-Type", "application/pdf");
      res.sendFile(path.resolve(pdfPath), (err) => {
        if (err && !res.headersSent)
          res.status(500).json({ error: "PDF gönderilemedi" });
      });
    } catch (e) {
      console.error("Acil ekip PDF hata:", e);
      res.status(500).json({ error: "Acil ekip PDF oluşturulamadı" });
    }
  }
);

// ----------------------------------------------------------
//  DÖF PDF
// ----------------------------------------------------------

app.post("/api/dof/pdf", async (req, res) => {
  try {
    const pdfPath = await createDofPdf(req.body || {});
    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(path.resolve(pdfPath));
  } catch (e) {
    console.error("DÖF PDF hata:", e);
    res.status(500).json({ error: "DÖF PDF oluşturulamadı" });
  }
});

// ----------------------------------------------------------
//  RİSK DEĞERLENDİRMESİ PDF
// ----------------------------------------------------------

app.post(
  ["/api/pdf/risk-degerlendirmesi", "/api/risk-degerlendirmesi/pdf"],
  async (req, res) => {
    try {
      const pdfPath = await createRiskDegerlendirmesiPdf(req.body || {});
      res.setHeader("Content-Type", "application/pdf");
      res.sendFile(path.resolve(pdfPath));
    } catch (e) {
      console.error("Risk Değerlendirmesi PDF hata:", e);
      res.status(500).json({
        error: "Risk Değerlendirmesi PDF oluşturulamadı",
      });
    }
  }
);

// ----------------------------------------------------------
//  RİSK EKİP ATAMA PDF
// ----------------------------------------------------------

app.post("/api/riskekip/pdf", async (req, res) => {
  try {
    const pdfPath = await createRiskEkipPdf(req.body || {});
    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(path.resolve(pdfPath));
  } catch (e) {
    console.error("Risk Ekip PDF hata:", e);
    res.status(500).json({ error: "Risk Ekip PDF oluşturulamadı" });
  }
});

// ----------------------------------------------------------
//  PROSEDÜR PDF
// ----------------------------------------------------------

app.post("/api/prosedur/pdf", async (req, res) => {
  try {
    const pdfPath = await createPdf(req.body || {});
    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(path.resolve(pdfPath));
  } catch (e) {
    console.error("Prosedür PDF hata:", e);
    res.status(500).json({ error: "Prosedür PDF oluşturulamadı" });
  }
});

// ----------------------------------------------------------
// 🆕  YILLIK EĞİTİM PLANI PDF
// ----------------------------------------------------------

app.post(
  ["/api/pdf/yillik-egitim-plani", "/api/yillik-egitim-plani/pdf"],
  async (req, res) => {
    try {
      const pdfPath = await createYillikEgitimPlaniPdf(req.body || {});
      res.setHeader("Content-Type", "application/pdf");
      res.sendFile(path.resolve(pdfPath), (err) => {
        if (err && !res.headersSent)
          res
            .status(500)
            .json({ error: "Yıllık Eğitim Planı PDF gönderilemedi" });
      });
    } catch (e) {
      console.error("Yıllık Eğitim Planı PDF hata:", e);
      res.status(500).json({
        error: "Yıllık Eğitim Planı PDF oluşturulamadı",
        detail: e.toString(),
      });
    }
  }
);

// ----------------------------------------------------------
//  STATİK DOSYA SERVE
// ----------------------------------------------------------

app.use("/uploads", express.static("uploads"));

// ----------------------------------------------------------
//  SERVER START
// ----------------------------------------------------------

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`SERVER ÇALIŞIYOR → http://localhost:${PORT}`);
});
