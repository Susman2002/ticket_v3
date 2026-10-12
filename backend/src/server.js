import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { startRotation, stopRotation, getCurrent, validateToken } from './qr.js';
import { createTicket, getTicketByToken, getWaitingTickets, getCalledTickets } from './tickets.js';

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
const originalRotate = getCurrent;
let lastToken = null;
setInterval(() => {
  const current = getCurrent();
  if (current.token !== lastToken) {
    broadcast('QR_ROTATED', { token: current.token, remainingSeconds: current.remainingSeconds });
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

// Tickets
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

// Servicios
app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, prefix FROM services WHERE active = true ORDER BY id');
    res.json(result.rows);
  } catch (e) {
    console.error('Error obteniendo servicios:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar servidor
async function start() {
  try {
    // Probar conexión DB
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