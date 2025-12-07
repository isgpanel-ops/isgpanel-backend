// backend/routes/documents.js
const express = require("express");
const router = express.Router();
const Document = require("../models/Document");

// ---- 1) Belgelerime Kaydet ----
router.post("/", async (req, res) => {
  try {
    const doc = await Document.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    console.error("Belge kaydedilemedi:", err);
    res.status(500).json({ message: "Belge kaydedilemedi." });
  }
});

// ---- 2) Listeleme ----
router.get("/", async (req, res) => {
  try {
    const { firmaId, category } = req.query;
    const filter = {};
    if (firmaId) filter.firmaId = firmaId;
    if (category) filter.category = category;

    const docs = await Document.find(filter).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error("Belgeler alınamadı:", err);
    res.status(500).json({ message: "Belgeler alınamadı." });
  }
});

// ---- 3) Durum değiştir (Arşivle) ----
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Document.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Durum güncellenemedi." });
  }
});

// ---- 4) Sil ----
router.delete("/:id", async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Silindi" });
  } catch (err) {
    res.status(500).json({ message: "Silinemedi." });
  }
});

module.exports = router;
