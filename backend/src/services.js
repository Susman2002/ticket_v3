import { pool } from './db.js';

export async function listServices(activeOnly = true) {
  const where = activeOnly ? 'WHERE active = true' : '';
  const result = await pool.query(
    `SELECT id, name, prefix, active, created_at FROM services ${where} ORDER BY id`
  );
  return result.rows;
}

export async function getServiceById(id) {
  const result = await pool.query(
    'SELECT id, name, prefix, active, created_at FROM services WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createService(name, prefix) {
  const result = await pool.query(
    `INSERT INTO services (name, prefix, active) VALUES ($1, $2, true)
     RETURNING id, name, prefix, active, created_at`,
    [name, prefix.toUpperCase()]
  );
  return result.rows[0];
}

export async function updateService(id, name, prefix, active) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
  if (prefix !== undefined) { fields.push(`prefix = $${idx++}`); values.push(prefix.toUpperCase()); }
  if (active !== undefined) { fields.push(`active = $${idx++}`); values.push(active); }

  if (fields.length === 0) return getServiceById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE services SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, name, prefix, active, created_at`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteService(id) {
  // Soft delete: desactivar
  return updateService(id, undefined, undefined, false);
}