const express = require("express");

const router = express.Router();

const profileController =
    require("../controllers/profileController");

const authenticate =
    require("../middleware/auth");

const uploadUserPhoto =
    require("../middleware/uploadPhoto");


router.get(
    "/",
    authenticate,
    profileController.getProfile
);


router.put(
    "/",
    authenticate,
    uploadUserPhoto.single("photo"),
    profileController.updateProfile
);


module.exports = router;