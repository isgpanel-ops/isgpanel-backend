// backend/routes/notifications.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// NOT: Şimdilik userId filtresi eklemedim,
// ileride giriş yapan kullanıcıya göre filtrelemek istersen
// query'den veya middleware'den userId alıp query'ye ekleyebilirsin.

// GET /api/notifications?status=unread&limit=10
router.get("/", async (req, res) => {
  try {
    const { status, limit = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json(notifications);
  } catch (err) {
    console.error("Bildirimler alınırken hata:", err);
    res.status(500).json({ message: "Bildirimler alınırken hata oluştu" });
  }
});

// GET /api/notifications/unread-count
router.get("/unread-count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({ status: "unread" });
    res.json({ count });
  } catch (err) {
    console.error("Unread count hata:", err);
    res.status(500).json({ message: "Sayım sırasında hata oluştu" });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: "read" },
      { new: true }
    );
    if (!notif) {
      return res.status(404).json({ message: "Bildirim bulunamadı" });
    }
    res.json(notif);
  } catch (err) {
    console.error("Mark as read hata:", err);
    res.status(500).json({ message: "Güncelleme sırasında hata oluştu" });
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req, res) => {
  try {
    await Notification.updateMany(
      { status: "unread" },
      { $set: { status: "read" } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark all read hata:", err);
    res.status(500).json({ message: "Toplu güncelleme sırasında hata oluştu" });
  }
});

module.exports = router;
