const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");

const getPIC = async (req, res) => {
  const users = await userModel.getUsersByRole("panitia");

  const result = users.map(u => ({
    id: u.id,
    name: u.full_name
  }));

  res.json(result);
};

const createPIC = async (req, res) => {
  const { full_name, username, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await userModel.createUser({
    full_name,
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: "panitia"
  });

  res.status(201).json({
    id: result.insertId,
    name: full_name
  });
};

const updatePIC = async (req, res) => {
  const { id } = req.params;
  const { full_name, username, email } = req.body;

  const affected = await userModel.updateUser(
    id,
    username.toLowerCase().trim(),
    full_name.trim(),
    email.toLowerCase().trim(),
    "panitia"
  );

  if (!affected) {
    return res.status(404).json({ message: "PIC not found" });
  }

  res.json({ message: "PIC updated" });
};

const deletePIC = async (req, res) => {
  const { id } = req.params;

  const affected = await userModel.deleteUser(id);

  if (!affected) {
    return res.status(404).json({ message: "PIC not found" });
  }

  res.json({ message: "PIC deleted" });
};

module.exports = {
  getPIC,
  createPIC,
  updatePIC,
  deletePIC
};