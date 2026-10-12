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

    // Verificar servicio existe y está activo
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

    // Obtener/incrementar secuencia atómicamente (UPSERT con bloqueo)
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

    // Insertar ticket
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