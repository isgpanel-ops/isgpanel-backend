const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Yetkisiz erişim: Token yok" });
    }

    const token = authHeader.split(" ")[1]; // "Bearer xxx"

    if (!token) {
      return res.status(401).json({ message: "Yetkisiz erişim: Token yok" });
    }

    const decoded = jwt.verify(token, "SUPER_SECRET_KEY"); // auth.js ile aynı key
    req.userId = decoded.id;

    next();
  } catch (err) {
    console.error("Auth middleware hata:", err);
    return res.status(401).json({ message: "Token geçersiz veya süresi dolmuş" });
  }
};
