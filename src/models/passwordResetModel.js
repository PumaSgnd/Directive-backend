const pool = require("../config/db");

const createPasswordReset = async ({
  user_id,
  token_hash,
  expires_at
}) => {
  const [result] = await pool.query(
    `
    INSERT INTO password_resets
    (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
    `,
    [
      user_id,
      token_hash,
      expires_at
    ]
  );

  return result;
};

const getValidPasswordReset = async (token_hash) => {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      user_id,
      token_hash,
      expires_at,
      used_at
    FROM password_resets
    WHERE token_hash = ?
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
    `,
    [token_hash]
  );

  return rows[0];
};

const markPasswordResetUsed = async (id) => {
  const [result] = await pool.query(
    `
    UPDATE password_resets
    SET used_at = NOW()
    WHERE id = ?
    `,
    [id]
  );

  return result.affectedRows;
};

const deleteUserPasswordResets = async (user_id) => {
  const [result] = await pool.query(
    `
    DELETE FROM password_resets
    WHERE user_id = ?
    `,
    [user_id]
  );

  return result.affectedRows;
};

module.exports = {
  createPasswordReset,
  getValidPasswordReset,
  markPasswordResetUsed,
  deleteUserPasswordResets
};