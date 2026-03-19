const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Render provides a DATABASE_URL environment variable.
// For local development, you can set it in a .env file or use a local connection string.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://fuelsystem_db_user:gk3Pjd8z9zbPlix639atYrusa1YKn9KT@dpg-d6tqppogjchc73ck1q7g-a/fuelsystem_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function init() {
  let connection;
  try {
    connection = await pool.connect();
    
    // Tables are no longer dropped to preserve data on restart.
    
    // Schema adapted for PostgreSQL

    // Create custom ENUM types for better data integrity
    await connection.query(`CREATE TYPE fuel_type_enum AS ENUM ('Extra', 'Regular', 'Diesel')`).catch(e => { if (e.code !== '42710') throw e; });
    await connection.query(`CREATE TYPE trip_status_enum AS ENUM ('Pending', 'Completed')`).catch(e => { if (e.code !== '42710') throw e; });
    
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
    
    // Check if we need to seed data (only if users table is empty)
    const { rows: userCountRows } = await connection.query('SELECT COUNT(*) as count FROM users');
    const shouldSeed = userCountRows[0].count === '0';

    if (shouldSeed) {
      // Sample users
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
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
          'INSERT INTO drivers (name, license_number, license_expiry, is_active) VALUES ($1, $2, $3, TRUE)',
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);
    if (shouldSeed) {
      const officialData = [
        ['CARLITO R. JUAREZ', 'City Accountant', 'CPA'],
        ['JAY WARREN R. PABILLARAN', 'City Mayor', 'City Mayor', '2025-01-05', '2030-12-05']
      ];
      for (const [name, position, title, term_start, term_end] of officialData) {
        await connection.query(
          'INSERT INTO officials (name, position, title, term_start, term_end, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)',
          [name, position, title, term_start || null, term_end || null]
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
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
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
          'INSERT INTO vehicles (plate_number, type, num_of_cylinder, normal_km_per_liter, is_active) VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (plate_number) DO NOTHING',
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
        "INSERT INTO fuel_rivs (id, riv_no, office, date, quantity_liters, status) VALUES (6, '2026-03-001', 'City Accounting Office', '2026-03-11', '0', 'Open') ON CONFLICT (id) DO NOTHING",
        []
      );
      await connection.query(
        "INSERT INTO fuel_rivs (id, riv_no, office, date, quantity_liters, status) VALUES (7, '2026-03-002', 'City Accounting Office', '2026-03-13', '0', 'Open') ON CONFLICT (id) DO NOTHING",
        []
      );
    }
    
    // 6. fuel_riv_items
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "fuel_riv_items" (
        "id" BIGSERIAL PRIMARY KEY,
        "fuel_riv_id" BIGINT NOT NULL,
        "fuel_type" fuel_type_enum NOT NULL,
        "quantity_liters" DECIMAL(10,2) NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_fuel_riv FOREIGN KEY (fuel_riv_id) REFERENCES fuel_rivs(id) ON DELETE CASCADE
      )
    `);
    if (shouldSeed) {
      await connection.query(
        "INSERT INTO fuel_riv_items (id, fuel_riv_id, fuel_type, quantity_liters) VALUES (6, 6, 'Diesel', 15.00) ON CONFLICT (id) DO NOTHING",
        []
      );
      await connection.query(
        "INSERT INTO fuel_riv_items (id, fuel_riv_id, fuel_type, quantity_liters) VALUES (7, 7, 'Diesel', 15.00) ON CONFLICT (id) DO NOTHING",
        []
      );
    }
    
    // 7. trip_tickets
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "trip_tickets" (
        "id" BIGSERIAL PRIMARY KEY,
        "fuel_riv_id" BIGINT NOT NULL,
        "plate_number" VARCHAR(255) NOT NULL,
        "driver_name" VARCHAR(255) NOT NULL,
        "authorized_passengers" VARCHAR(255),
        "destination" VARCHAR(255) NOT NULL,
        "purpose" TEXT,
        "benchmark_kpl" DECIMAL(8,2) NOT NULL DEFAULT 10.00,
        "status" trip_status_enum NOT NULL DEFAULT 'Pending',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_fuel_riv FOREIGN KEY (fuel_riv_id) REFERENCES fuel_rivs(id) ON DELETE CASCADE
      )
    `);
    if (shouldSeed) {
      await connection.query(
        "INSERT INTO trip_tickets (id, fuel_riv_id, plate_number, driver_name, authorized_passengers, destination, purpose, benchmark_kpl, status) VALUES (6, 6, 'ABC-12345', 'Jhon Doe', 'N/A', 'Malaybalay City', 'Restock', 10.00, 'Completed') ON CONFLICT (id) DO NOTHING",
        []
      );
      await connection.query(
        "INSERT INTO trip_tickets (id, fuel_riv_id, plate_number, driver_name, authorized_passengers, destination, purpose, benchmark_kpl, status) VALUES (7, 7, 'ABC-12345', 'Jhon Legend', 'N/A', 'Malaybalay City', 'RESUPPLY', 10.00, 'Pending') ON CONFLICT (id) DO NOTHING",
        []
      );
    }
    
    // 8. trip_logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS "trip_logs" (
        "id" BIGSERIAL PRIMARY KEY,
        "trip_ticket_id" BIGINT NOT NULL,
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
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_trip_ticket FOREIGN KEY (trip_ticket_id) REFERENCES trip_tickets(id) ON DELETE CASCADE
      )
    `);
    if (shouldSeed) {
      await connection.query(
        "INSERT INTO trip_logs (id, trip_ticket_id, dep_time, dep_place, arr_time, arr_place, odo_beginning, odo_ending, total_distance, gasoline_used, gasoline_issued, gasoline_excess, gasoline_purchased_outside, oil_used, grease_used, brake_fluid_used, gear_oil_used, balance_in_tank_start, balance_in_tank_end) VALUES (11, 6, '2026-03-11 08:43:00', 'Malaybalay City(City Hall)', '2026-03-11 09:43:00', 'Malaybalay City(Gaisano)', 0.00, 150.00, 150.00, 15.00, 0.00, 0.00, 0.00, 0.25, 0.25, 0.25, 0.25, 15.00, 0.00) ON CONFLICT (id) DO NOTHING",
        []
      );
    }

    console.log('✅ Exact fuel system schema created with sample data (8 tables, relations, samples). Login: admin@cao.gov.ph/password123');
  } catch (err) {
    console.error('Database init error:', err);
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

function getDB() {
  return pool; // Return promise-based interface
}

// Generic helper to fetch all from a table
const getAll = (tableName, useSoftDelete = false) => async () => {
  const db = getDB();
  let query = `SELECT * FROM "${tableName}"`;
  if (useSoftDelete) {
      query += ` WHERE "deleted_at" IS NULL`;
  }
  
  const { rows } = await db.query(query);
  return rows;
};

// Generic helper to fetch by ID
const getById = (tableName) => async (id) => {
  const db = getDB();
  const { rows } = await db.query(`SELECT * FROM "${tableName}" WHERE id = $1`, [id]);
  return rows[0];
};

// Generic helper for soft delete
const softDelete = (tableName) => async (id) => {
    const db = getDB();
    const result = await db.query(`UPDATE "${tableName}" SET deleted_at = $1 WHERE id = $2`, [new Date(), id]);
    return result.rowCount > 0;
};

// --- Users ---
const getAllUsers = getAll('users', false);
const getUserById = getById('users');
async function getUserByEmail(email) {
    const db = getDB();
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
}
async function createUser(user) {
    const { name, email, password, role } = user;
    const hashedPassword = await bcrypt.hash(password, 10);
    const db = getDB();
    const result = await db.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id', [name, email, hashedPassword, role || 'user']);
    return { id: result.rows[0].id, name, email, role };
}

async function updateUser(id, user) {
    const { name, email, role } = user;
    const db = getDB();
    // For security, password is not updated via this generic method.
    // A separate "change password" flow would be better.
    await db.query('UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4', [name, email, role, id]);
    return getUserById(id);
}

async function deleteUser(id) {
    const db = getDB();
    // Using a hard delete for users.
    const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
}

// --- Drivers ---
const getAllDrivers = getAll('drivers', true);
const getDriverById = getById('drivers');
const deleteDriver = softDelete('drivers');
async function createDriver(driver) {
    const { name, license_number, license_expiry } = driver;
    const db = getDB();
    const result = await db.query('INSERT INTO drivers (name, license_number, license_expiry) VALUES ($1, $2, $3) RETURNING id', [name, license_number, license_expiry]);
    return { id: result.rows[0].id, ...driver };
}
async function updateDriver(id, driver) {
    const { name, license_number, license_expiry, is_active } = driver;
    const db = getDB();
    await db.query('UPDATE drivers SET name = $1, license_number = $2, license_expiry = $3, is_active = $4 WHERE id = $5', [name, license_number, license_expiry, is_active, id]);
    return getDriverById(id);
}


// --- Officials ---
const getAllOfficials = getAll('officials', true);
const getOfficialById = getById('officials');
const deleteOfficial = softDelete('officials');
async function createOfficial(official) {
    const { name, position, title, term_start, term_end } = official;
    const db = getDB();
    const result = await db.query('INSERT INTO officials (name, position, title, term_start, term_end) VALUES ($1, $2, $3, $4, $5) RETURNING id', [name, position, title, term_start, term_end]);
    return { id: result.rows[0].id, ...official };
}
async function updateOfficial(id, official) {
    const { name, position, title, term_start, term_end, is_active } = official;
    const db = getDB();
    await db.query('UPDATE officials SET name = $1, position = $2, title = $3, term_start = $4, term_end = $5, is_active = $6 WHERE id = $7', [name, position, title, term_start, term_end, is_active, id]);
    return getOfficialById(id);
}

// --- Vehicles ---
const getAllVehicles = getAll('vehicles', true);
const getVehicleById = getById('vehicles');
const deleteVehicle = softDelete('vehicles');
async function createVehicle(vehicle) {
    const { plate_number, type, num_of_cylinder, normal_km_per_liter } = vehicle;
    const db = getDB();
    const result = await db.query('INSERT INTO vehicles (plate_number, type, num_of_cylinder, normal_km_per_liter) VALUES ($1, $2, $3, $4) RETURNING id', [plate_number, type, num_of_cylinder, normal_km_per_liter]);
    return { id: result.rows[0].id, ...vehicle };
}
async function updateVehicle(id, vehicle) {
    const { plate_number, type, num_of_cylinder, normal_km_per_liter, is_active } = vehicle;
    const db = getDB();
    await db.query('UPDATE vehicles SET plate_number = $1, type = $2, num_of_cylinder = $3, normal_km_per_liter = $4, is_active = $5 WHERE id = $6', [plate_number, type, num_of_cylinder, normal_km_per_liter, is_active, id]);
    return getVehicleById(id);
}

// --- Fuel RIVs ---
const getAllFuelRivs = getAll('fuel_rivs', false);
const getFuelRivById = getById('fuel_rivs');
async function createFuelRiv(riv) {
    const { riv_no, office, date, items } = riv;
    const db = getDB();
    const result = await db.query('INSERT INTO fuel_rivs (riv_no, office, date, quantity_liters) VALUES ($1, $2, $3, 0) RETURNING id', [riv_no, office, date]);
    const rivId = result.rows[0].id;
    if (items && items.length > 0) {
        for (const item of items) {
            await createFuelRivItem({ ...item, fuel_riv_id: rivId });
        }
    }
    return getFuelRivById(rivId);
}
async function getFuelRivWithItems(id) {
    const riv = await getFuelRivById(id);
    if (riv) {
        const db = getDB();
        const { rows: items } = await db.query('SELECT * FROM fuel_riv_items WHERE fuel_riv_id = $1', [id]);
        riv.items = items;
    }
    return riv;
}


// --- Fuel RIV Items ---
const getAllFuelRivItems = getAll('fuel_riv_items', false);
const getFuelRivItemById = getById('fuel_riv_items');
async function createFuelRivItem(item) {
    const { fuel_riv_id, fuel_type, quantity_liters } = item;
    const db = getDB();
    const result = await db.query('INSERT INTO fuel_riv_items (fuel_riv_id, fuel_type, quantity_liters) VALUES ($1, $2, $3) RETURNING id', [fuel_riv_id, fuel_type, quantity_liters]);
    return { id: result.rows[0].id, ...item };
}

// --- Trip Tickets ---
async function getAllTripTickets() {
    const db = getDB();
    const { rows } = await db.query(`
        SELECT tt.*, fr.riv_no 
        FROM trip_tickets tt
        LEFT JOIN fuel_rivs fr ON tt.fuel_riv_id = fr.id
        ORDER BY tt.id DESC
    `);
    return rows;
}
const getTripTicketById = getById('trip_tickets');
async function createTripTicket(ticket) {
    // FIX: If fuel_riv_id is missing (new form submission), use the auto-generation logic
    if (!ticket.fuel_riv_id) {
        return createTripTicketWithRiv(ticket);
    }

    const { fuel_riv_id, plate_number, driver_name, authorized_passengers, destination, purpose, benchmark_kpl } = ticket;
    const db = getDB();
    const result = await db.query(
        'INSERT INTO trip_tickets (fuel_riv_id, plate_number, driver_name, authorized_passengers, destination, purpose, benchmark_kpl) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [fuel_riv_id, plate_number, driver_name, authorized_passengers, destination, purpose, benchmark_kpl]
    );
    return { id: result.rows[0].id, ...ticket };
}
async function getTripTicketsByRivId(rivId) {
    const db = getDB();
    const { rows } = await db.query('SELECT * FROM trip_tickets WHERE fuel_riv_id = $1', [rivId]);
    return rows;
}
async function updateTripTicketStatus(id, status) {
    const db = getDB();
    await db.query('UPDATE trip_tickets SET status = $1 WHERE id = $2', [status, id]);
    return getTripTicketById(id);
}


// --- Trip Logs ---
const getAllTripLogs = getAll('trip_logs', false);
const getTripLogById = getById('trip_logs');
async function createTripLog(log) {
    const db = getDB();
    const columns = Object.keys(log).map(c => `"${c}"`).join(', ');
    const valuePlaceholders = Object.keys(log).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(log);

    const query = `INSERT INTO trip_logs (${columns}) VALUES (${valuePlaceholders}) RETURNING id`;
    const result = await db.query(query, values);
    return { id: result.rows[0].id, ...log };
}
async function updateTripLog(id, data) {
    const db = getDB();
    const columns = Object.keys(data);
    const setClause = columns.map((key, i) => `"${key}" = $${i + 1}`).join(', ');
    const values = [...Object.values(data), id];

    const query = `UPDATE trip_logs SET ${setClause} WHERE id = $${columns.length + 1}`;
    await db.query(query, values);
    return getTripLogById(id);
}
async function getTripLogByTicketId(ticketId) {
    const db = getDB();
    const { rows } = await db.query('SELECT * FROM trip_logs WHERE trip_ticket_id = $1', [ticketId]);
    return rows[0];
}
async function getTripLogsByTicketId(ticketId) {
    const db = getDB();
    const { rows } = await db.query('SELECT * FROM trip_logs WHERE trip_ticket_id = $1 ORDER BY dep_time ASC, id ASC', [ticketId]);
    return rows;
}

// --- Reports ---
async function generateMonthlyReport(month, year) {
    const db = getDB();
    let query = `
        SELECT 
            tt.id as ticket_id,
            tt.plate_number,
            tt.driver_name,
            tt.destination,
            tt.purpose,
            TO_CHAR(tl.dep_time, 'YYYY-MM-DD HH24:MI') as dep_time_fmt,
            TO_CHAR(tl.arr_time, 'YYYY-MM-DD HH24:MI') as arr_time_fmt,
            tl.total_distance,
            tl.gasoline_issued,
            tl.gasoline_used
        FROM trip_tickets tt
        JOIN trip_logs tl ON tt.id = tl.trip_ticket_id
        WHERE EXTRACT(MONTH FROM tl.dep_time) = $1 AND EXTRACT(YEAR FROM tl.dep_time) = $2
        ORDER BY tl.dep_time ASC
    `;
    const { rows } = await db.query(query, [month, year]);
    return rows;
}

async function createTripTicketWithRiv(data) {
    const db = getDB();
    const connection = await db.connect();
    try {
        await connection.beginTransaction();

        const dateObj = new Date();
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const prefix = `${year}-${month}`;
        
        // Auto-generate RIV No: YYYY-MM-###
        const { rows } = await connection.query(`
            SELECT riv_no FROM fuel_rivs 
            WHERE riv_no LIKE $1 
            ORDER BY riv_no DESC 
            LIMIT 1 FOR UPDATE
        `, [`${prefix}-%`]);
        
        let nextNum = 1;
        if (rows.length > 0) {
            const parts = rows[0].riv_no.split('-');
            if (parts.length === 3) {
                 const lastNum = parseInt(parts[2], 10);
                 if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
        }
        const rivNo = `${prefix}-${String(nextNum).padStart(3, '0')}`;

        // Ensure defaults
        const qty = data.fuel_quantity || 0;

        // Create RIV
        const rivResult = await connection.query(
            'INSERT INTO fuel_rivs (riv_no, office, date, quantity_liters, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [rivNo, 'City Accounting Office', dateObj, qty, 'Open']
        );
        const rivId = rivResult.rows[0].id;

        // Create RIV Item
        await connection.query(
            'INSERT INTO fuel_riv_items (fuel_riv_id, fuel_type, quantity_liters) VALUES ($1, $2, $3)',
            [rivId, data.fuel_type || 'Diesel', qty]
        );

        // Create Trip Ticket
        const ticketResult = await connection.query(
            'INSERT INTO trip_tickets (fuel_riv_id, plate_number, driver_name, authorized_passengers, destination, purpose, benchmark_kpl, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [rivId, data.plate_number, data.driver_name, data.authorized_passengers || 'N/A', data.destination, data.purpose || '', data.benchmark_kpl || 10.00, 'Pending']
        );

        await connection.commit();
        return { id: ticketResult.rows[0].id, riv_no: rivNo };

    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function getNextRivNumber() {
    const db = getDB();
    const dateObj = new Date();
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}`;
    
    const { rows } = await db.query(`
        SELECT riv_no FROM fuel_rivs 
        WHERE riv_no LIKE $1 
        ORDER BY riv_no DESC 
        LIMIT 1
    `, [`${prefix}-%`]);
    
    let nextNum = 1;
    if (rows.length > 0) {
        const parts = rows[0].riv_no.split('-');
        if (parts.length === 3) {
             const lastNum = parseInt(parts[2], 10);
             if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
    }
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

async function getSummaryDataForMonth(month, year) {
    const db = getDB();
    const query = `
        SELECT 
            EXTRACT(DAY FROM fr.date) as day,
            STRING_AGG(DISTINCT fr.riv_no, ', ') as riv_numbers,
            SUM(CASE WHEN fri.fuel_type = 'Extra' THEN fri.quantity_liters ELSE 0 END) as Extra,
            SUM(CASE WHEN fri.fuel_type = 'Regular' THEN fri.quantity_liters ELSE 0 END) as Regular,
            SUM(CASE WHEN fri.fuel_type = 'Diesel' THEN fri.quantity_liters ELSE 0 END) as Diesel
        FROM 
            fuel_rivs fr
        JOIN 
            fuel_riv_items fri ON fr.id = fri.fuel_riv_id
        WHERE 
            EXTRACT(MONTH FROM fr.date) = $1 AND EXTRACT(YEAR FROM fr.date) = $2
        GROUP BY 
            EXTRACT(DAY FROM fr.date)
        ORDER BY 
            day ASC;
    `;
    const { rows } = await db.query(query, [month, year]);
    return rows;
}

async function getMonthlyTravelData(month, year, driverName, plateNumber) {
    const db = getDB();
    const query = `
        SELECT 
            EXTRACT(DAY FROM tl.dep_time) as day,
            SUM(COALESCE(tl.total_distance, 0)) as distance,
            SUM(COALESCE(tl.gasoline_used, 0)) as gasoline,
            SUM(COALESCE(tl.oil_used, 0)) as oil,
            SUM(COALESCE(tl.grease_used, 0)) as grease,
            STRING_AGG(DISTINCT tt.destination, ', ') as remarks,
            MAX(tt.plate_number) as plate_number
        FROM trip_tickets tt
        JOIN trip_logs tl ON tt.id = tl.trip_ticket_id
        WHERE EXTRACT(MONTH FROM tl.dep_time) = $1 AND EXTRACT(YEAR FROM tl.dep_time) = $2 AND tt.driver_name = $3 AND tt.plate_number = $4
        GROUP BY EXTRACT(DAY FROM tl.dep_time)
        ORDER BY day ASC
    `;
    const { rows } = await db.query(query, [month, year, driverName, plateNumber]);
    return rows;
}

async function getDriversForVehicleInMonth(month, year, plateNumber) {
    const db = getDB();
    const query = `
        SELECT DISTINCT tt.driver_name
        FROM trip_tickets tt
        JOIN trip_logs tl ON tt.id = tl.trip_ticket_id
        WHERE 
            EXTRACT(MONTH FROM tl.dep_time) = $1
            AND EXTRACT(YEAR FROM tl.dep_time) = $2 
            AND tt.plate_number = $3
        ORDER BY tt.driver_name ASC;
    `;
    const { rows } = await db.query(query, [month, year, plateNumber]);
    return rows;
}

async function getFuelConsumptionReportData(month, year) {
    const db = getDB();
    const query = `
        SELECT
            v.type AS type_of_vehicle,
            tt.plate_number,
            v.num_of_cylinder,
            v.normal_km_per_liter,
            MIN(tl.odo_beginning) AS odo_beginning,
            MAX(tl.odo_ending) AS odo_ending,
            SUM(tl.total_distance) AS total_distance,
            SUM(tl.gasoline_used) AS total_fuel_used
        FROM
            trip_tickets tt
        JOIN
            trip_logs tl ON tt.id = tl.trip_ticket_id
        JOIN
            vehicles v ON tt.plate_number = v.plate_number
        WHERE
            EXTRACT(MONTH FROM tl.dep_time) = $1 AND EXTRACT(YEAR FROM tl.dep_time) = $2
            AND tl.total_distance > 0 AND tl.gasoline_used > 0
        GROUP BY
            tt.plate_number, v.type, v.num_of_cylinder, v.normal_km_per_liter
        ORDER BY
            tt.plate_number;
    `;
    const { rows } = await db.query(query, [month, year]);
    return rows;
}

module.exports = {
  init,
  getDB,
  // Users
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  // Drivers
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  // Officials
  getAllOfficials,
  getOfficialById,
  createOfficial,
  updateOfficial,
  deleteOfficial,
  // Vehicles
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  // Fuel RIVs
  getAllFuelRivs,
  getFuelRivById,
  createFuelRiv,
  getFuelRivWithItems,
  // Fuel RIV Items
  getAllFuelRivItems,
  getFuelRivItemById,
  createFuelRivItem,
  // Trip Tickets
  getAllTripTickets,
  getTripTicketById,
  createTripTicket,
  getTripTicketsByRivId,
  updateTripTicketStatus,
  // Trip Logs
  getAllTripLogs,
  getTripLogById,
  createTripLog,
  updateTripLog,
  getTripLogByTicketId,
  getTripLogsByTicketId,
  // Reports
  generateMonthlyReport,
  createTripTicketWithRiv,
  getNextRivNumber,
  getSummaryDataForMonth,
  getMonthlyTravelData,
  getDriversForVehicleInMonth,
  getFuelConsumptionReportData
};
