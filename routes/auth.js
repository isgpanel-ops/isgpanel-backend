const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// DİKKAT: models/user.js dosyasını kullanıyoruz (tamamen küçük harf)
// Linux'ta User.js ile user.js farklı dosya sayılır.
const User = require("../models/user");

const router = express.Router();

// JWT gizli anahtar (Render'da .env'den okunur)
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_KEY";

// KAYIT OL
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Bu email zaten kayıtlı." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.json({ message: "Kayıt başarılı" });
  } catch (err) {
    console.error("REGISTER HATA:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GİRİŞ YAP
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Kullanıcı bulunamadı" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Şifre hatalı" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN HATA:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
