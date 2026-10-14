import { pool } from './db.js';
import bcrypt from 'bcryptjs';

export async function listUsers() {
  const result = await pool.query(
    `SELECT u.id, u.username, u.role_id, u.active, u.created_at, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     ORDER BY u.id`
  );
  return result.rows;
}

export async function getUserById(id) {
  const result = await pool.query(
    `SELECT u.id, u.username, u.role_id, u.active, u.created_at, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser(username, password, roleId) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (username, password_hash, role_id, active)
     VALUES ($1, $2, $3, true)
     RETURNING id, username, role_id, active, created_at`,
    [username, passwordHash, roleId]
  );
  return result.rows[0];
}

export async function updateUser(id, username, roleId, active) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (username !== undefined) { fields.push(`username = $${idx++}`); values.push(username); }
  if (roleId !== undefined) { fields.push(`role_id = $${idx++}`); values.push(roleId); }
  if (active !== undefined) { fields.push(`active = $${idx++}`); values.push(active); }

  if (fields.length === 0) return getUserById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, username, role_id, active, created_at`,
    values
  );
  return result.rows[0] || null;
}

export async function updateUserPassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2
     RETURNING id, username, role_id, active, created_at`,
    [passwordHash, id]
  );
  return result.rows[0] || null;
}

export async function deleteUser(id) {
  return updateUser(id, undefined, undefined, false);
}

export async function listRoles() {
  const result = await pool.query('SELECT id, name FROM roles ORDER BY id');
  return result.rows;
}