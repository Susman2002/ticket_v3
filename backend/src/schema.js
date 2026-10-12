import { pool } from './db.js';

const schema = `
-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  prefix VARCHAR(10) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Windows
CREATE TABLE IF NOT EXISTS windows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Operator Sessions
CREATE TABLE IF NOT EXISTS operator_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  window_id INT NOT NULL REFERENCES windows(id),
  service_id INT REFERENCES services(id),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  active BOOLEAN DEFAULT true
);

-- Partial unique index: una ventanilla activa por sesión
CREATE UNIQUE INDEX IF NOT EXISTS uq_operator_sessions_window_active
  ON operator_sessions(window_id) WHERE active;

-- Ticket Sequences (numeración por servicio y fecha)
CREATE TABLE IF NOT EXISTS ticket_sequences (
  id SERIAL PRIMARY KEY,
  service_id INT NOT NULL REFERENCES services(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_number INT NOT NULL DEFAULT 0,
  UNIQUE (service_id, date)
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  service_id INT NOT NULL REFERENCES services(id),
  number INT NOT NULL,
  display_number VARCHAR(20) NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_service', 'completed', 'cancelled', 'transferred')),
  window_id INT REFERENCES windows(id),
  operator_session_id INT REFERENCES operator_sessions(id),
  qr_token VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  called_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  transferred_at TIMESTAMP
);

-- Partial unique index: número único por servicio y fecha (día)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_service_number_date
  ON tickets(service_id, number, CAST(created_at AS DATE));

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_tickets_status_service ON tickets(service_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_token ON tickets(token);
`;

export async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('Esquema creado correctamente');
  } finally {
    client.release();
  }
}

initSchema().catch(console.error);