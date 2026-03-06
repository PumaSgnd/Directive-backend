const express = require("express");
const {
    getJuri,
    createJuri,
    updateJuri,
    deleteJuri,
} = require("../controllers/juriController");

const router = express.Router();

router.get("/", getJuri);
router.post("/", createJuri);
router.put("/:id", updateJuri);
router.delete("/:id", deleteJuri);

module.exports = router;