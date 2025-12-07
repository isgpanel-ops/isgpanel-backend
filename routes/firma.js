const express = require("express");
const Firma = require("../models/Firma");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/firma
 * Giriş yapan kullanıcının tüm firmalarını getirir
 */
router.get("/", auth, async (req, res) => {
  try {
    const firmalar = await Firma.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(firmalar);
  } catch (err) {
    console.error("Firma listeleme hata:", err);
    res.status(500).json({ message: "Firma listesi alınamadı" });
  }
});

/**
 * POST /api/firma
 * Yeni firma ekler (sadece giriş yapan kullanıcı için)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { firmaAdi, sgkNo, adres, telefon, sektor } = req.body;

    if (!firmaAdi) {
      return res.status(400).json({ message: "Firma adı zorunludur" });
    }

    const yeniFirma = await Firma.create({
      userId: req.userId,
      firmaAdi,
      sgkNo,
      adres,
      telefon,
      sektor,
    });

    res.status(201).json(yeniFirma);
  } catch (err) {
    console.error("Firma ekleme hata:", err);
    res.status(500).json({ message: "Firma eklenemedi" });
  }
});

/**
 * DELETE /api/firma/:id
 * İsteğe bağlı: Sadece kendi firmasını silebilsin
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const firma = await Firma.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!firma) {
      return res.status(404).json({ message: "Firma bulunamadı" });
    }

    res.json({ message: "Firma silindi" });
  } catch (err) {
    console.error("Firma silme hata:", err);
    res.status(500).json({ message: "Firma silinemedi" });
  }
});

module.exports = router;
