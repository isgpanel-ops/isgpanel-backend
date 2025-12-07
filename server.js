require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");

const app = express();

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS
app.use(cors({
  origin: [
    "http://localhost:5173",
    process.env.FRONTEND_URL
  ],
  credentials: true
}));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB bağlı"))
  .catch(err => console.error("MongoDB hata:", err));

// Routes
app.use("/api/auth", authRoutes);

// PDF Routes (hazır çalışır)
const { createPdf } = require("./pdf/prosedur");
const { createRiskEkipPdf } = require("./pdf/riskEkip");
const { createDofPdf } = require("./pdf/dof");
const { createRiskDegerlendirmesiPdf } = require("./pdf/riskdegerlendirmesi");
const { createAcilEkipPdf } = require("./pdf/acilEkip");
const { createYillikEgitimPlaniPdf } = require("./pdf/yillikEgitimPlani");

app.post("/api/prosedur/pdf", async (req, res) => {
  const pdfPath = await createPdf(req.body);
  res.sendFile(path.resolve(pdfPath));
});

app.post("/api/riskekip/pdf", async (req, res) => {
  const pdfPath = await createRiskEkipPdf(req.body);
  res.sendFile(path.resolve(pdfPath));
});

app.post("/api/dof/pdf", async (req, res) => {
  const pdfPath = await createDofPdf(req.body);
  res.sendFile(path.resolve(pdfPath));
});

app.post("/api/risk-degerlendirmesi/pdf", async (req, res) => {
  const pdfPath = await createRiskDegerlendirmesiPdf(req.body);
  res.sendFile(path.resolve(pdfPath));
});

app.post("/api/acil-ekipleri/pdf", async (req, res) => {
  const pdfPath = await createAcilEkipPdf(req.body);
  res.sendFile(path.resolve(pdfPath));
});

app.post("/api/yillik-egitim-plani/pdf", async (req, res) => {
  const pdfPath = await createYillikEgitimPlaniPdf(req.body);
  res.sendFile(path.resolve(pdfPath));
});

// Uploads static
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log("Backend çalışıyor:", PORT));
