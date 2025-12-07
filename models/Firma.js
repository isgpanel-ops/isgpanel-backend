const mongoose = require("mongoose");

const FirmaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    firmaAdi: { type: String, required: true },
    sgkNo: { type: String },
    adres: { type: String },
    telefon: { type: String },
    sektor: { type: String },
    // ihtiyaca göre alan ekleyebilirsin
  },
  { timestamps: true }
);

module.exports = mongoose.model("Firma", FirmaSchema);
