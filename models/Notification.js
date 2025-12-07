// backend/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // İleride çoklu kullanıcıya geçersen işine yarar
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Firma",
      required: false,
    },
    type: {
      type: String,
      enum: ["time", "event", "system", "subscription"],
      required: true,
    },
    module: {
      type: String,
      enum: [
        "risk",
        "acil",
        "yillikPlan",
        "egitim",
        "talimat",
        "abonelik",
        "genel",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    status: {
      type: String,
      enum: ["unread", "read", "archived"],
      default: "unread",
    },
    // Tarihe bağlı işler için (risk, eğitim, abonelik vs.)
    dueDate: {
      type: Date,
    },
    // Bildirime tıklayınca gideceğin route
    link: {
      type: String,
      trim: true,
    },
    // Aynı şey için tekrar tekrar bildirim üretmemek için
    key: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
