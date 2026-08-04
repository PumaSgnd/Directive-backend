const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");

const getJuri = async (req, res) => {
  const users = await userModel.getUsersByRole("juri");

  const result = users.map(u => ({
    id: u.id,
    name: u.full_name
  }));

  res.json(result);
};

const createJuri = async (req, res) => {
  const { full_name, username, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await userModel.createUser({
    full_name,
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: "juri"
  });

  res.status(201).json({
    id: result.insertId,
    name: full_name
  });
};

const updateJuri = async (req, res) => {
  const { id } = req.params;
  const { full_name, username, email } = req.body;

  const affected = await userModel.updateUser(
    id,
    username.toLowerCase().trim(),
    full_name.trim(),
    email.toLowerCase().trim(),
    "juri"
  );

  if (!affected) {
    return res.status(404).json({ message: "PIC not found" });
  }

  res.json({ message: "PIC updated" });
};

const deleteJuri = async (req, res) => {
  const { id } = req.params;

  const affected = await userModel.deleteUser(id);

  if (!affected) {
    return res.status(404).json({ message: "Juri not found" });
  }

  res.json({ message: "Juri deleted" });
};

module.exports = {
  getJuri,
  createJuri,
  updateJuri,
  deleteJuri
};