const jwt = require("jsonwebtoken");

const jwtMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) return res.status(401).json({ error: "Token not found" });
  const token = authorization.split(" ")[1];
  if (!token) return res.status(401).json({ error: "unAuthorized access" });
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decode;
    req.adminId = decode.id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const generateToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: "5h" });
};

module.exports = { jwtMiddleware, generateToken };
