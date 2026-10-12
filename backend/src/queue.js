import { pool } from './db.js';

export async function getWaitingTickets(serviceId) {
  const result = await pool.query(
    `SELECT t.*, s.name as service_name, s.prefix
     FROM tickets t
     JOIN services s ON t.service_id = s.id
     WHERE t.service_id = $1 AND t.status = 'waiting'
     ORDER BY t.created_at ASC`,
    [serviceId]
  );
  return result.rows;
}

export async function getQueueSummary() {
  const result = await pool.query(
    `SELECT s.id as service_id, s.name, s.prefix,
            COUNT(t.id) FILTER (WHERE t.status = 'waiting') as waiting_count,
            COUNT(t.id) FILTER (WHERE t.status = 'called') as called_count,
            COUNT(t.id) FILTER (WHERE t.status = 'in_service') as in_service_count
     FROM services s
     LEFT JOIN tickets t ON t.service_id = s.id AND t.status IN ('waiting', 'called', 'in_service')
     WHERE s.active = true
     GROUP BY s.id, s.name, s.prefix
     ORDER BY s.id`
  );
  return result.rows;
}

export async function callNextTicket(operatorSessionId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener sesión del operador con servicio
    const sessionResult = await client.query(
      `SELECT os.*, w.name as window_name
       FROM operator_sessions os
       JOIN windows w ON os.window_id = w.id
       WHERE os.id = $1 AND os.active = true`,
      [operatorSessionId]
    );
    if (sessionResult.rows.length === 0) {
      const error = new Error('Sesión de operador no encontrada o inactiva');
      error.statusCode = 400;
      throw error;
    }
    const session = sessionResult.rows[0];
    const serviceId = session.service_id;
    const windowId = session.window_id;

    // Buscar primer ticket waiting de ese servicio (FOR UPDATE para lock)
    const ticketResult = await client.query(
      `SELECT id, token, display_number
       FROM tickets
       WHERE service_id = $1 AND status = 'waiting'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [serviceId]
    );
    if (ticketResult.rows.length === 0) {
      const error = new Error('No hay tickets en espera para este servicio');
      error.statusCode = 404;
      throw error;
    }
    const ticket = ticketResult.rows[0];

    // Actualizar ticket a called
    const updateResult = await client.query(
      `UPDATE tickets
       SET status = 'called', window_id = $1, operator_session_id = $2, called_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, service_id, number, display_number, token, status, window_id, operator_session_id, called_at, created_at`,
      [windowId, operatorSessionId, ticket.id]
    );

    await client.query('COMMIT');
    const calledTicket = updateResult.rows[0];

    // Obtener datos completos para respuesta
    const fullResult = await pool.query(
      `SELECT t.*, s.name as service_name, s.prefix, w.name as window_name
       FROM tickets t
       JOIN services s ON t.service_id = s.id
       LEFT JOIN windows w ON t.window_id = w.id
       WHERE t.id = $1`,
      [calledTicket.id]
    );
    return fullResult.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}