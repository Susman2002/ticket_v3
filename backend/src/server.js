import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { startRotation, stopRotation, getCurrent, validateToken } from './qr.js';
import { createTicket, getTicketByToken, getWaitingTickets, getCalledTickets, startService, completeService, cancelService, transferTicket, getCurrentTicketForOperator } from './tickets.js';
import { authenticate, generateToken, authRequired, requireRole } from './auth.js';
import { listServices, getServiceById, createService, updateService, deleteService } from './services.js';
import { listWindows, getWindowById, createWindow, updateWindow, deleteWindow, isWindowAvailable } from './windows.js';
import { startSession, endSession, getCurrentSession, getActiveSessions } from './operatorSessions.js';
import { getWaitingTickets as getQueueWaiting, getQueueSummary, callNextTicket } from './queue.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// WebSocket clients
const clients = new Set();

function broadcast(event, data) {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Cliente WebSocket conectado');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Cliente WebSocket desconectado');
  });

  ws.on('error', (err) => {
    console.error('Error WebSocket:', err);
    clients.delete(ws);
  });
});

// Emitir QR_ROTATED cada rotación
let lastToken = null;
setInterval(() => {
  const current = getCurrent();
  if (current.token !== lastToken) {
    broadcast('QR_ROTATED', current);
    lastToken = current.token;
  }
}, 1000);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// QR endpoints
app.get('/api/qr/current', (req, res) => {
  res.json(getCurrent());
});

app.get('/api/qr/validate/:token', (req, res) => {
  res.json({ valid: validateToken(req.params.token) });
});

// Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    const user = await authenticate(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e) {
    console.error('Error en login:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Servicios (público: listar; admin: CRUD)
app.get('/api/services', async (req, res) => {
  try {
    const services = await listServices(true);
    res.json(services);
  } catch (e) {
    console.error('Error obteniendo servicios:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/services', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { name, prefix } = req.body;
    if (!name || !prefix) {
      return res.status(400).json({ error: 'name y prefix son requeridos' });
    }
    const service = await createService(name, prefix);
    res.status(201).json(service);
  } catch (e) {
    console.error('Error creando servicio:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/services/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { name, prefix, active } = req.body;
    const service = await updateService(req.params.id, name, prefix, active);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(service);
  } catch (e) {
    console.error('Error actualizando servicio:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/services/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const service = await deleteService(req.params.id);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(service);
  } catch (e) {
    console.error('Error eliminando servicio:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ventanillas (público: listar; admin: CRUD)
app.get('/api/windows', async (req, res) => {
  try {
    const windows = await listWindows(true);
    res.json(windows);
  } catch (e) {
    console.error('Error obteniendo ventanillas:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/windows', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name es requerido' });
    const window = await createWindow(name);
    res.status(201).json(window);
  } catch (e) {
    console.error('Error creando ventanilla:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/windows/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { name, active } = req.body;
    const window = await updateWindow(req.params.id, name, active);
    if (!window) return res.status(404).json({ error: 'Ventanilla no encontrada' });
    res.json(window);
  } catch (e) {
    console.error('Error actualizando ventanilla:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/windows/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const window = await deleteWindow(req.params.id);
    if (!window) return res.status(404).json({ error: 'Ventanilla no encontrada' });
    res.json(window);
  } catch (e) {
    console.error('Error eliminando ventanilla:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Sesiones de Operador (requiere auth operador/admin)
app.post('/api/operator/session/start', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const { window_id, service_id } = req.body;
    if (!window_id || !service_id) {
      return res.status(400).json({ error: 'window_id y service_id son requeridos' });
    }
    const session = await startSession(req.user.id, window_id, service_id);
    broadcast('operator_session_started', { session, operator: req.user.username });
    res.status(201).json(session);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
    console.error('Error iniciando sesión:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/operator/session/end', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const session = await endSession(req.user.id);
    if (!session) return res.status(404).json({ error: 'No hay sesión activa' });
    broadcast('operator_session_ended', { sessionId: session.id, operator: req.user.username });
    res.json(session);
  } catch (e) {
    console.error('Error finalizando sesión:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/operator/session/current', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const session = await getCurrentSession(req.user.id);
    if (!session) return res.status(404).json({ error: 'No hay sesión activa' });
    res.json(session);
  } catch (e) {
    console.error('Error obteniendo sesión:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cola de espera (público para display, operador para panel)
app.get('/api/queue/:service_id', async (req, res) => {
  try {
    const tickets = await getQueueWaiting(req.params.service_id);
    res.json(tickets);
  } catch (e) {
    console.error('Error obteniendo cola:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/queue', async (req, res) => {
  try {
    const summary = await getQueueSummary();
    res.json(summary);
  } catch (e) {
    console.error('Error obteniendo resumen colas:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Llamar siguiente (operador)
app.post('/api/operator/call-next', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const session = await getCurrentSession(req.user.id);
    if (!session) {
      return res.status(400).json({ error: 'No hay sesión activa. Inicie sesión en una ventanilla primero.' });
    }
    const ticket = await callNextTicket(session.id);
    broadcast('ticket_called', ticket);
    res.json(ticket);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
    console.error('Error llamando siguiente:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar atención (operador)
app.post('/api/operator/ticket/start', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const session = await getCurrentSession(req.user.id);
    if (!session) {
      return res.status(400).json({ error: 'No hay sesión activa' });
    }
    const { ticket_id } = req.body;
    if (!ticket_id) {
      return res.status(400).json({ error: 'ticket_id es requerido' });
    }
    const ticket = await startService(ticket_id, session.id);
    broadcast('ticket_updated', ticket);
    res.json(ticket);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
    console.error('Error iniciando atención:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Completar atención (operador)
app.post('/api/operator/ticket/complete', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const session = await getCurrentSession(req.user.id);
    if (!session) {
      return res.status(400).json({ error: 'No hay sesión activa' });
    }
    const { ticket_id } = req.body;
    if (!ticket_id) {
      return res.status(400).json({ error: 'ticket_id es requerido' });
    }
    const ticket = await completeService(ticket_id, session.id);
    broadcast('ticket_updated', ticket);
    res.json(ticket);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
    console.error('Error completando atención:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cancelar atención (operador)
app.post('/api/operator/ticket/cancel', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const session = await getCurrentSession(req.user.id);
    if (!session) {
      return res.status(400).json({ error: 'No hay sesión activa' });
    }
    const { ticket_id } = req.body;
    if (!ticket_id) {
      return res.status(400).json({ error: 'ticket_id es requerido' });
    }
    const ticket = await cancelService(ticket_id, session.id);
    broadcast('ticket_updated', ticket);
    res.json(ticket);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
    console.error('Error cancelando atención:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Transferir ticket (operador)
app.post('/api/operator/ticket/transfer', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const session = await getCurrentSession(req.user.id);
    if (!session) {
      return res.status(400).json({ error: 'No hay sesión activa' });
    }
    const { ticket_id, target_window_id } = req.body;
    if (!ticket_id || !target_window_id) {
      return res.status(400).json({ error: 'ticket_id y target_window_id son requeridos' });
    }
    const result = await transferTicket(ticket_id, session.id, target_window_id);
    const { transfer_info, ...ticket } = result;
    broadcast('ticket_transferred', { ticket, transfer_info });
    broadcast('ticket_updated', ticket);
    res.json(result);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
    console.error('Error transfiriendo ticket:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ticket actual en atención (operador)
app.get('/api/operator/ticket/current', authRequired, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const session = await getCurrentSession(req.user.id);
    if (!session) {
      return res.status(404).json({ error: 'No hay sesión activa' });
    }
    const ticket = await getCurrentTicketForOperator(session.id);
    if (!ticket) {
      return res.status(404).json({ error: 'No hay ticket en atención' });
    }
    res.json(ticket);
  } catch (e) {
    console.error('Error obteniendo ticket actual:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Tickets (público: crear con QR, consultar por token)
app.post('/api/tickets', async (req, res) => {
  try {
    const { service_id, qr_token } = req.body;
    if (!service_id || !qr_token) {
      return res.status(400).json({ error: 'service_id y qr_token son requeridos' });
    }
    const ticket = await createTicket(service_id, qr_token);
    broadcast('ticket_created', ticket);
    res.status(201).json(ticket);
  } catch (e) {
    if (e.statusCode === 403) {
      return res.status(403).json({ error: e.message });
    }
    if (e.statusCode === 404) {
      return res.status(404).json({ error: e.message });
    }
    console.error('Error creando ticket:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/tickets/:token', async (req, res) => {
  try {
    const ticket = await getTicketByToken(req.params.token);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    res.json(ticket);
  } catch (e) {
    console.error('Error obteniendo ticket:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar servidor
async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Conexión a PostgreSQL exitosa');

    startRotation();
    console.log('QR rotativo iniciado');

    server.listen(PORT, () => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
      console.log(`WebSocket disponible en ws://localhost:${PORT}/ws`);
    });
  } catch (e) {
    console.error('Error al iniciar:', e);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Cerrando servidor...');
  stopRotation();
  wss.close();
  await pool.end();
  server.close(() => process.exit(0));
});

start();