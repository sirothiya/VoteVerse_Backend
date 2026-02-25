

const jwt = require("jsonwebtoken");

const jwtMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token not found" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = decoded;           // full payload
    req.userId = decoded.id;
    req.userRole = decoded.role;  // ⭐ admin | candidate

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: "1d",
  });
};

module.exports = { jwtMiddleware, generateToken };