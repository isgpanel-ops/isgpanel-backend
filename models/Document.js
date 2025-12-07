// backend/models/Document.js
const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    firmaId: { type: String, required: true },
    firmaAdi: { type: String, required: true },

    category: { type: String, required: true },   // risk, acil, yillik, eğitim...
    subCategory: { type: String },

    title: { type: String, required: true },
    year: { type: Number },

    status: {
      type: String,
      enum: ["hazir", "arsiv"],
      default: "hazir",
    },

    createdBy: { type: String }, // İSG Uzmanı adı
    fileUrl: { type: String },   // ileride PDF yolu buraya gelecek
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Document", DocumentSchema);
