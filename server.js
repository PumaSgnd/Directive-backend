const express = require("express");
const cors = require('cors');
const registerRoute = require("./src/routes/registerRoute.js");
const loginRoute = require("./src/routes/loginRoute.js");
const userRoute = require("./src/routes/userRoutes.js");
const disciplineRoutes = require("./src/routes/discipline.js");
const picRoutes = require("./src/routes/picRoutes.js");
const juriRoutes = require("./src/routes/juriRoutes.js");
const pesertaRoutes = require("./src/routes/pesertaRoutes.js");
const errorHandler = require("./src/middleware/errorHandler");
const pertandinganRoute = require("./src/routes/pertandinganRoute.js");
const penilaianRoute = require("./src/routes/penilaianRoutes.js");
const profileRoutes = require("./src/routes/profileRoutes.js");

require("dotenv").config();

const app = express();
const port = 5000;
const path = require("path");

app.use(cors());
app.use(express.json());
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

app.use("/api/register", registerRoute);
app.use("/api/login", loginRoute);
app.use("/api/user", userRoute);
app.use("/api/discipline", disciplineRoutes);
app.use("/api/pic", picRoutes);
app.use("/api/juri", juriRoutes);
app.use("/api/peserta", pesertaRoutes);
app.use("/api/pertandingan", pertandinganRoute);
app.use("/api/penilaian", penilaianRoute);
app.use("/api/profile", profileRoutes);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
