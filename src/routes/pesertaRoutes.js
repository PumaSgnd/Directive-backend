const express = require("express");
const {
    getPeserta,
    createPeserta,
    updatePeserta,
    deletePeserta,
} = require("../controllers/pesertaController");

const router = express.Router();

router.get("/", getPeserta);
router.post("/", createPeserta);
router.put("/:id", updatePeserta);
router.delete("/:id", deletePeserta);

module.exports = router;