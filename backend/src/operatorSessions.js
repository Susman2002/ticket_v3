import { pool } from './db.js';

export async function startSession(userId, windowId, serviceId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar ventanilla existe y está activa
    const windowResult = await client.query(
      'SELECT id, active FROM windows WHERE id = $1',
      [windowId]
    );
    if (windowResult.rows.length === 0 || !windowResult.rows[0].active) {
      const error = new Error('Ventanilla no encontrada o inactiva');
      error.statusCode = 400;
      throw error;
    }

    // Verificar servicio existe y está activo
    const serviceResult = await client.query(
      'SELECT id, active FROM services WHERE id = $1',
      [serviceId]
    );
    if (serviceResult.rows.length === 0 || !serviceResult.rows[0].active) {
      const error = new Error('Servicio no encontrado o inactivo');
      error.statusCode = 400;
      throw error;
    }

    // Verificar que la ventanilla no tenga sesión activa (índice único parcial lo garantiza, pero validamos antes)
    const sessionCheck = await client.query(
      'SELECT id FROM operator_sessions WHERE window_id = $1 AND active = true',
      [windowId]
    );
    if (sessionCheck.rows.length > 0) {
      const error = new Error('La ventanilla ya está ocupada por otro operador');
      error.statusCode = 409;
      throw error;
    }

    // Verificar que el operador no tenga ya una sesión activa
    const operatorCheck = await client.query(
      'SELECT id FROM operator_sessions WHERE user_id = $1 AND active = true',
      [userId]
    );
    if (operatorCheck.rows.length > 0) {
      const error = new Error('El operador ya tiene una sesión activa');
      error.statusCode = 409;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO operator_sessions (user_id, window_id, service_id, active)
       VALUES ($1, $2, $3, true)
       RETURNING id, user_id, window_id, service_id, started_at, active`,
      [userId, windowId, serviceId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function endSession(userId) {
  const result = await pool.query(
    `UPDATE operator_sessions
     SET active = false, ended_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND active = true
     RETURNING id, user_id, window_id, service_id, started_at, ended_at, active`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function getCurrentSession(userId) {
  const result = await pool.query(
    `SELECT os.*, w.name as window_name, s.name as service_name, s.prefix as service_prefix
     FROM operator_sessions os
     JOIN windows w ON os.window_id = w.id
     JOIN services s ON os.service_id = s.id
     WHERE os.user_id = $1 AND os.active = true`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function getSessionById(sessionId) {
  const result = await pool.query(
    `SELECT os.*, w.name as window_name, s.name as service_name, s.prefix as service_prefix
     FROM operator_sessions os
     JOIN windows w ON os.window_id = w.id
     JOIN services s ON os.service_id = s.id
     WHERE os.id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

export async function getActiveSessions() {
  const result = await pool.query(
    `SELECT os.*, u.username, w.name as window_name, s.name as service_name, s.prefix as service_prefix
     FROM operator_sessions os
     JOIN users u ON os.user_id = u.id
     JOIN windows w ON os.window_id = w.id
     JOIN services s ON os.service_id = s.id
     WHERE os.active = true`
  );
  return result.rows;
}