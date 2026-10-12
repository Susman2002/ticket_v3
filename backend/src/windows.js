import { pool } from './db.js';

export async function listWindows(activeOnly = true) {
  const where = activeOnly ? 'WHERE active = true' : '';
  const result = await pool.query(
    `SELECT id, name, active, created_at FROM windows ${where} ORDER BY id`
  );
  return result.rows;
}

export async function getWindowById(id) {
  const result = await pool.query(
    'SELECT id, name, active, created_at FROM windows WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createWindow(name) {
  const result = await pool.query(
    `INSERT INTO windows (name, active) VALUES ($1, true)
     RETURNING id, name, active, created_at`,
    [name]
  );
  return result.rows[0];
}

export async function updateWindow(id, name, active) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
  if (active !== undefined) { fields.push(`active = $${idx++}`); values.push(active); }

  if (fields.length === 0) return getWindowById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE windows SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, name, active, created_at`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteWindow(id) {
  return updateWindow(id, undefined, false);
}

export async function isWindowAvailable(windowId) {
  const result = await pool.query(
    `SELECT id FROM operator_sessions WHERE window_id = $1 AND active = true`,
    [windowId]
  );
  return result.rows.length === 0;
}