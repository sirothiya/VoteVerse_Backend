const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ message: "Role not found in token" });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};

module.exports = allowRoles;