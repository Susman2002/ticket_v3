import bcrypt from 'bcryptjs';
import { pool } from './db.js';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Roles
    await client.query(`
      INSERT INTO roles (name) VALUES ('admin'), ('operator')
      ON CONFLICT (name) DO NOTHING
    `);

    // Obtener role IDs
    const rolesResult = await client.query('SELECT id, name FROM roles');
    const roleMap = Object.fromEntries(rolesResult.rows.map(r => [r.name, r.id]));

    // Hash passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const operatorHash = await bcrypt.hash('operador123', 10);

    // Users
    await client.query(`
      INSERT INTO users (username, password_hash, role_id, active)
      VALUES ($1, $2, $3, true), ($4, $5, $6, true)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminHash, roleMap.admin, 'operador1', operatorHash, roleMap.operator]);

    // Services (3 trámites iniciales)
    await client.query(`
      INSERT INTO services (name, prefix, active)
      VALUES 
        ('Trámite General', 'TR1', true),
        ('Licencias', 'TR2', true),
        ('Certificados', 'TR3', true)
      ON CONFLICT DO NOTHING
    `);

    // Windows (3 ventanillas iniciales)
    await client.query(`
      INSERT INTO windows (name, active)
      VALUES ('Ventanilla 1', true), ('Ventanilla 2', true), ('Ventanilla 3', true)
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Semillas insertadas correctamente');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error en seed:', e);
    throw e;
  } finally {
    client.release();
  }
}

seed().catch(() => process.exit(1));