const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized: Token missing"
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: Token invalid"
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        message: "Unauthorized: Invalid payload"
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired"
      });
    }

    return res.status(401).json({
      message: "Unauthorized: Invalid token"
    });
  }
};

module.exports = authenticate;