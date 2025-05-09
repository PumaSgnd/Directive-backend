const express = require('express');
const { getDisciplines, createDiscipline, updateDiscipline, deleteDiscipline } = require("../controllers/discipline.js");

const router = express.Router();

router.get("/", getDisciplines);
router.post("/", createDiscipline);
router.put("/:id", updateDiscipline);
router.delete("/:id", deleteDiscipline);

module.exports = router;
