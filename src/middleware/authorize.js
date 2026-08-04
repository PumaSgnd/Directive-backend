const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        message: "Unauthorized: User tidak terautentikasi"
      });
    }

    const userRole = req.user.role;

    if (userRole === "developer") {
      return next();
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: "Akses ditolak"
      });
    }

    next();
  };
};

module.exports = authorizeRole;