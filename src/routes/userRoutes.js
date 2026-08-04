const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authenticate = require("../middleware/auth");
const authorizeRole = require("../middleware/authorize");

// admin only
router.get("/", authenticate, authorizeRole(["admin"]), userController.getUsers);
router.post("/", authenticate, authorizeRole(["admin"]), userController.createUser);
router.put("/:id", authenticate, authorizeRole(["admin"]), userController.updateUser);
router.delete("/:id", authenticate, authorizeRole(["admin"]), userController.deleteUser);

module.exports = router;