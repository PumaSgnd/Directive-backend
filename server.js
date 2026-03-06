const express = require("express");
const cors = require('cors');
const registerRoute = require("./src/routes/registerRoute.js");
const loginRoute = require("./src/routes/loginRoute.js");
const userRoute = require("./src/routes/userRoutes.js");
const disciplineRoutes = require("./src/routes/discipline.js");
const picRoutes = require("./src/routes/picRoutes.js");
const juriRoutes = require("./src/routes/juriRoutes.js");
const pesertaRoutes = require("./src/routes/pesertaRoutes.js");

require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.use("/api/register", registerRoute);
app.use("/api/login", loginRoute);
app.use("/api/user", userRoute);
app.use("/api/discipline", disciplineRoutes);
app.use("/api/pic", picRoutes);
app.use("/api/juri", juriRoutes);
app.use("/api/peserta", pesertaRoutes)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
