const express = require("express");
const cors = require('cors');
const registerRoute = require("./routes/registerRoute");
const loginRoute = require("./routes/loginRoute");
const disciplineRoutes = require("./routes/discipline.js");
require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.use("/api/register", registerRoute);
app.use("/api/login", loginRoute);
app.use("/api/discipline", disciplineRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
