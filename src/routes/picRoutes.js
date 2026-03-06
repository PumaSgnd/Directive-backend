const express = require("express");
const {
    getPIC,
    createPIC,
    updatePIC,
    deletePIC,
} = require("../controllers/picController");

const router = express.Router();

router.get("/", getPIC);
router.post("/", createPIC);
router.put("/:id", updatePIC);
router.delete("/:id", deletePIC);

module.exports = router;