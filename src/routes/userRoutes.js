const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const upload = require("../middleware/uploadPhoto");

router.get("/", userController.getUsers);
router.get("/:id", userController.getUserProfile);
router.post("/", userController.createUser);

router.put("/:id", userController.updateUser);

router.put(
    "/photo/:id",
    upload.single("photo"),
    userController.updateProfilePhoto
);

module.exports = router;