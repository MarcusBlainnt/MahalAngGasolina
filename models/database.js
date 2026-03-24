const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://fuelsystem_db_user:gk3Pjd8z9zbPlix639atYrusa1YKn9KT@dpg-d6tqppogjchc73ck1q7g-a/fuelsystem_db',
  ssl: { rejectUnauthorized: false } // required on Render
});

async function init() {
  let connection;
  try {
    connection = await pool.connect();
    
    // Create custom ENUM types
    await connection.query(`CREATE TYPE IF NOT EXISTS fuel_type_enum AS ENUM ('Extra', 'Regular', 'Diesel')`);
    await connection.query(`CREATE TYPE IF NOT EXISTS trip_status_enum AS ENUM ('Pending', 'Completed')`);
    
    // 1. users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "email_verified_at" TIMESTAMP,
        "password" VARCHAR(255) NOT NULL,
        "role" VARCHAR(255) NOT NULL DEFAULT 'user',
        "remember_token" VARCHAR(100),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const { rows: userCountRows } = await connection.query('SELECT COUNT(*)::int as count FROM users');
    const shouldSeed = userCountRows[0].count === 0;

    if (shouldSeed) {
      const userData = [
        ['Administrator', 'mcadmin@gmail.com', '$2y$12$wAqVamB1k9b2U8zMLOAd5uMi05rzTyXjTWwulvh/RGXuVYqvS935e', 'admin'],
        ['Mark Jude Bantilan', 'marcusblainnt1998@gmail.com', '$2y$12$aL9YXy8W7udqHM3rb1sFTed76.NbEubmS9ViCZDFJQUkXF1dAygNe', 'user'],
        ['Admin User', 'admin@cao.gov.ph', '$2b$10$sy6l31YD8jWVcwGcNv44YO1CFR/1wLnqXKxr.EjSHLGow0DAspYLG', 'admin']
      ];
      for (const [name, email, password, role] of userData) {
        await connection.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
          [name, email, password, role]
        );
      }
    }
    
    // 2. drivers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "drivers" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "license_number" VARCHAR(255),
        "license_expiry" DATE,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);
    if (shouldSeed) {
      const driverData = [
        ['Jhon Doe', 'DL-123456789', '2030-03-12'],
        ['Jhon Legend', 'DL-234567890', '2030-03-12'],
        ['JL Cruz', 'DL-345678901', '2030-03-12']
      ];
      for (const [name, license, expiry] of driverData) {
        await connection.query(
          'INSERT INTO drivers (name, license_number, license_expiry, is_active) VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING',
          [name, license, expiry]
        );
      }
    }
    
    // 3. officials
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "officials" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "position" VARCHAR(255) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "term_start" DATE,
        "term_end" DATE,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);
    if (shouldSeed) {
      const officialData = [
        ['CARLITO R. JUAREZ', 'City Accountant', 'CPA', null, null],
        ['JAY WARREN R. PABILLARAN', 'City Mayor', 'City Mayor', '2025-01-05', '2030-12-05']
      ];
      for (const [name, position, title, term_start, term_end] of officialData) {
        await connection.query(
          'INSERT INTO officials (name, position, title, term_start, term_end, is_active) VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT DO NOTHING',
          [name, position, title, term_start, term_end]
        );
      }
    }
    
    // 4. vehicles
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "vehicles" (
        "id" BIGSERIAL PRIMARY KEY,
        "plate_number" VARCHAR(255) NOT NULL UNIQUE,
        "type" VARCHAR(255) NOT NULL,
        "num_of_cylinder" VARCHAR(255) NOT NULL,
        "normal_km_per_liter" DECIMAL(8,2) NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);
    if (shouldSeed) {
      const vehicleData = [
        ['ABC-12345', 'Van', '4', 12.50],
        ['ABC-23456', 'SUV', '6', 13.50],
        ['ABC-34567', 'Pickup', '8', 15.80]
      ];
      for (const [plate, type, cylinders, kpl] of vehicleData) {
        await connection.query(
          'INSERT INTO vehicles (plate_number, type, num_of_cylinder, normal_km_per_liter, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (plate_number) DO NOTHING',
          [plate, type, cylinders, kpl]
        );
      }
    }
    
    // 5. fuel_rivs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "fuel_rivs" (
        "id" BIGSERIAL PRIMARY KEY,
        "riv_no" VARCHAR(255) NOT NULL UNIQUE,
        "office" VARCHAR(255),
        "date" DATE NOT NULL,
        "quantity_liters" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "status" VARCHAR(255) NOT NULL DEFAULT 'Open',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    if (shouldSeed) {
      await connection.query(
        "INSERT INTO fuel_rivs (riv_no, office, date, quantity_liters, status) VALUES ('2026-03-001', 'City Accounting Office', '2026-03-11', 0, 'Open') ON CONFLICT (riv_no) DO NOTHING"
      );
      await connection.query(
        "INSERT INTO fuel_rivs (riv_no, office, date, quantity_liters, status) VALUES ('2026-03-002', 'City Accounting Office', '2026-03 Ascending', 0, 'Open') ON CONFLICT (riv_no) DO NOTHING"
      );
    }
    
    // 6. fuel_riv_items
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "fuel_riv_items" (
        "id" BIGSERIAL PRIMARY KEY,
        "fuel_riv_id" BIGINT NOT NULL REFERENCES "fuel_rivs"(id) ON DELETE CASCADE,
        "fuel_type" fuel_type_enum NOT NULL,
        "quantity_liters" DECIMAL(10,2) NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    if (shouldSeed) {
      await connection.query(
        "INSERT INTO fuel_riv_items (fuel_riv_id, fuel_type, quantity_liters) VALUES ((SELECT id FROM fuel_rivs WHERE riv_no = '2026-03-001'), 'Diesel', 15.00) ON CONFLICT DO NOTHING"
      );
      await connection.query(
        "INSERT INTO fuel_riv_items (fuel_riv_id, fuel_type, quantity_liters) VALUES ((SELECT id FROM fuel_rivs WHERE riv_no = '2026-03 Ascending'), 'Diesel', 15.00) ON CONFLICT DO NOTHING"
      );
    }
    
    // 7. trip_tickets
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "trip_tickets" (
        "id" BIGSERIAL PRIMARY KEY,
        "fuel_riv_id" BIGINT NOT NULL REFERENCES "fuel_rivs"(id) ON DELETE CASCADE,
        "plate_number" VARCHAR(255) NOT NULL,
        "driver_name" VARCHAR(255) NOT NULL,
        "authorized_passengers" VARCHAR(255),
        "destination" VARCHAR(255) NOT NULL,
        "purpose" TEXT,
        "benchmark_kpl" DECIMAL(8,2) NOT NULL DEFAULT 10.00,
        "status" trip_status_enum NOT NULL DEFAULT 'Pending',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    if (shouldSeed) {
      await connection.query(
        "INSERT INTO trip_tickets (fuel_riv_id, plate_number, driver_name, authorized_passengers, destination, purpose, benchmark_kpl, status) VALUES ((SELECT id FROM fuel_rivs WHERE riv_no = '2026-03-001'), 'ABC-12345', 'Jhon Doe', 'N/A', 'Malaybalay City', 'Restock', 10.00, 'Completed') ON CONFLICT DO NOTHING"
      );
    }
    
    // 8. trip_logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "trip_logs" (
        "id" BIGSERIAL PRIMARY KEY,
        "trip_ticket_id" BIGINT NOT NULL REFERENCES "trip_tickets"(id) ON DELETE CASCADE,
        "dep_time" TIMESTAMP,
        "dep_place" VARCHAR(255),
        "arr_time" TIMESTAMP,
        "arr_place" VARCHAR(255),
        "odo_beginning" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        "odo_ending" DECIMAL(12,2),
        "total_distance" DECIMAL(12,2),
        "gasoline_used" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "gasoline_issued" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "gasoline_excess" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "gasoline_purchased_outside" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "oil_used" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "grease_used" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "brake_fluid_used" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "gear_oil_used" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "balance_in_tank_start" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "balance_in_tank_end" DECIMAL(10,2),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    if (shouldSeed) {
      await connection.query(`
        INSERT INTO trip_logs (trip_ticket_id, dep_time, dep_place, arr_time, arr_place, odo_beginning, odo_ending, total_distance, gasoline_used, gasoline_issued, gasoline_excess, gasoline_purchased_outside, oil_used, grease_used, brake_fluid_used, gear_oil_used, balance_in_tank_start, balance_in_tank_end) 
        VALUES ((SELECT id FROM trip_tickets WHERE plate_number = 'ABC-12345' LIMIT 1), '2026-03-11 08:43:00', 'Malaybalay City(City Hall)', '2026-03-11 09:43:00', 'Malaybalay City(Gaisano)', 0, 150, 150, 15, 0, 0, 0, 0.25, 0.25, 0.25, 0.25, 15, 0) ON CONFLICT DO NOTHING
      `);
    }

    console.log('✅ PostgreSQL schema created with sample data for Render/Supabase. Login: admin@cao.gov.ph / password123');
  } catch (err) {
    console.error('Database init error:', err);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// Generic helpers and all CRUD/report functions identical to backup (omitted for brevity)
function getDB() {
  return pool;
}

// [All other functions: getAllUsers, CRUD, reports - copy from backup exactly]
const getAll = (tableName, useSoftDelete = false) => async () => {
  const db = getDB();
  let query = `SELECT * FROM "${tableName}"`;
  if (useSoftDelete) query += ` WHERE "deleted_at" IS NULL`;
  const { rows } = await db.query(query);
  return rows;
};

const getById = (tableName) => async (id) => {
  const db = getDB();
  const { rows } = await db.query(`SELECT * FROM "${tableName}" WHERE id = $1`, [id]);
  return rows[0];
};

module.exports = {
  init,
  getDB,
  getAllUsers: getAll('users'),
  // ... all other exports from backup
};
