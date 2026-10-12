import crypto from 'crypto';
import { pool } from './db.js';
import { validateToken } from './qr.js';

const INVALID_QR_MESSAGE = 'El código QR ha expirado o no es válido. Por favor escana el código que se muestra en la pantalla de la sala.';

export async function createTicket(serviceId, qrToken) {
  if (!validateToken(qrToken)) {
    const error = new Error(INVALID_QR_MESSAGE);
    error.statusCode = 403;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const serviceResult = await client.query(
      'SELECT id, prefix FROM services WHERE id = $1 AND active = true',
      [serviceId]
    );
    if (serviceResult.rows.length === 0) {
      const error = new Error('Servicio no encontrado o inactivo');
      error.statusCode = 404;
      throw error;
    }
    const { prefix } = serviceResult.rows[0];

    const sequenceResult = await client.query(
      `INSERT INTO ticket_sequences (service_id, date, last_number)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (service_id, date) DO UPDATE SET last_number = ticket_sequences.last_number + 1
       RETURNING last_number`,
      [serviceId]
    );
    const number = sequenceResult.rows[0].last_number;
    const displayNumber = `${prefix}-${String(number).padStart(3, '0')}`;
    const token = crypto.randomUUID();

    const ticketResult = await client.query(
      `INSERT INTO tickets (service_id, number, display_number, token, qr_token, status)
       VALUES ($1, $2, $3, $4, $5, 'waiting')
       RETURNING id, service_id, number, display_number, token, status, created_at`,
      [serviceId, number, displayNumber, token, qrToken]
    );

    await client.query('COMMIT');
    return ticketResult.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getTicketByToken(token) {
  const result = await pool.query(
    `SELECT t.*, s.name as service_name, s.prefix, w.name as window_name
     FROM tickets t
     JOIN services s ON t.service_id = s.id
     LEFT JOIN windows w ON t.window_id = w.id
     WHERE t.token = $1`,
    [token]
  );
  return result.rows[0] || null;
}

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

export async function getCalledTickets(limit = 10) {
  const result = await pool.query(
    `SELECT t.*, s.name as service_name, s.prefix, w.name as window_name
     FROM tickets t
     JOIN services s ON t.service_id = s.id
     LEFT JOIN windows w ON t.window_id = w.id
     WHERE t.status IN ('called', 'in_service', 'transferred')
     ORDER BY t.called_at DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ===== FASE 3: Gestión de atención =====

export async function startService(ticketId, operatorSessionId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ticketResult = await client.query(
      `SELECT t.*, os.user_id as operator_user_id
       FROM tickets t
       JOIN operator_sessions os ON t.operator_session_id = os.id
       WHERE t.id = $1 AND t.status = 'called' AND t.operator_session_id = $2
       FOR UPDATE`,
      [ticketId, operatorSessionId]
    );
    if (ticketResult.rows.length === 0) {
      const error = new Error('Ticket no encontrado, no está en estado "called" o no pertenece a esta sesión');
      error.statusCode = 400;
      throw error;
    }

    const updateResult = await client.query(
      `UPDATE tickets
       SET status = 'in_service', started_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, service_id, number, display_number, token, status, window_id, operator_session_id, started_at, created_at`,
      [ticketId]
    );

    await client.query('COMMIT');
    const ticket = updateResult.rows[0];
    return getTicketFull(ticket.id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function completeService(ticketId, operatorSessionId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ticketResult = await client.query(
      `SELECT t.*
       FROM tickets t
       WHERE t.id = $1 AND t.status = 'in_service' AND t.operator_session_id = $2
       FOR UPDATE`,
      [ticketId, operatorSessionId]
    );
    if (ticketResult.rows.length === 0) {
      const error = new Error('Ticket no encontrado, no está en atención o no pertenece a esta sesión');
      error.statusCode = 400;
      throw error;
    }

    const updateResult = await client.query(
      `UPDATE tickets
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, service_id, number, display_number, token, status, window_id, operator_session_id, completed_at, created_at`,
      [ticketId]
    );

    await client.query('COMMIT');
    const ticket = updateResult.rows[0];
    return getTicketFull(ticket.id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelService(ticketId, operatorSessionId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ticketResult = await client.query(
      `SELECT t.*
       FROM tickets t
       WHERE t.id = $1 AND t.status IN ('waiting', 'called', 'in_service') AND t.operator_session_id = $2
       FOR UPDATE`,
      [ticketId, operatorSessionId]
    );
    if (ticketResult.rows.length === 0) {
      const error = new Error('Ticket no encontrado, no se puede cancelar o no pertenece a esta sesión');
      error.statusCode = 400;
      throw error;
    }

    const updateResult = await client.query(
      `UPDATE tickets
       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, service_id, number, display_number, token, status, window_id, operator_session_id, cancelled_at, created_at`,
      [ticketId]
    );

    await client.query('COMMIT');
    const ticket = updateResult.rows[0];
    return getTicketFull(ticket.id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function transferTicket(ticketId, operatorSessionId, targetWindowId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar ticket actual pertenece al operador y está en estado transferible
    const ticketResult = await client.query(
      `SELECT t.*, os.window_id as current_window_id, os.user_id as operator_user_id
       FROM tickets t
       JOIN operator_sessions os ON t.operator_session_id = os.id
       WHERE t.id = $1 AND t.status IN ('called', 'in_service') AND t.operator_session_id = $2
       FOR UPDATE`,
      [ticketId, operatorSessionId]
    );
    if (ticketResult.rows.length === 0) {
      const error = new Error('Ticket no encontrado, no se puede transferir o no pertenece a esta sesión');
      error.statusCode = 400;
      throw error;
    }
    const ticket = ticketResult.rows[0];

    // Verificar ventanilla destino tiene sesión activa
    const targetSessionResult = await client.query(
      `SELECT os.id, os.user_id, os.window_id, os.service_id
       FROM operator_sessions os
       WHERE os.window_id = $1 AND os.active = true`,
      [targetWindowId]
    );
    if (targetSessionResult.rows.length === 0) {
      const error = new Error('La ventanilla destino no tiene una sesión activa');
      error.statusCode = 400;
      throw error;
    }
    const targetSession = targetSessionResult.rows[0];

    // Verificar que sea el mismo servicio (operador solo atiende un servicio por sesión)
    if (targetSession.service_id !== ticket.service_id) {
      const error = new Error('La ventanilla destino atiende un servicio diferente');
      error.statusCode = 400;
      throw error;
    }

    // No transferir a la misma ventanilla
    if (targetSession.window_id === ticket.window_id) {
      const error = new Error('No se puede transferir a la misma ventanilla');
      error.statusCode = 400;
      throw error;
    }

    const updateResult = await client.query(
      `UPDATE tickets
       SET status = 'transferred', window_id = $1, operator_session_id = $2, transferred_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, service_id, number, display_number, token, status, window_id, operator_session_id, transferred_at, created_at`,
      [targetSession.window_id, targetSession.id, ticketId]
    );

    await client.query('COMMIT');
    const updatedTicket = updateResult.rows[0];
    const fullTicket = await getTicketFull(updatedTicket.id);
    
    // Incluir info de transferencia para WebSocket
    return {
      ...fullTicket,
      transfer_info: {
        from_window_id: ticket.window_id,
        from_operator_session_id: operatorSessionId,
        to_window_id: targetSession.window_id,
        to_operator_session_id: targetSession.id,
        to_operator_user_id: targetSession.user_id
      }
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getCurrentTicketForOperator(operatorSessionId) {
  const result = await pool.query(
    `SELECT t.*, s.name as service_name, s.prefix, w.name as window_name
     FROM tickets t
     JOIN services s ON t.service_id = s.id
     LEFT JOIN windows w ON t.window_id = w.id
     WHERE t.operator_session_id = $1 AND t.status IN ('called', 'in_service')
     ORDER BY t.called_at DESC
     LIMIT 1`,
    [operatorSessionId]
  );
  return result.rows[0] || null;
}

async function getTicketFull(ticketId) {
  const result = await pool.query(
    `SELECT t.*, s.name as service_name, s.prefix, w.name as window_name
     FROM tickets t
     JOIN services s ON t.service_id = s.id
     LEFT JOIN windows w ON t.window_id = w.id
     WHERE t.id = $1`,
    [ticketId]
  );
  return result.rows[0] || null;
}