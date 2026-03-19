const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');

async function migrate() {
  const sqlitePath = path.join(__dirname, '..', 'fuel_system.db');
  const sqliteDb = new sqlite3.Database(sqlitePath);
  sqliteDb.get('PRAGMA foreign_keys=OFF'); // Speed up
  
  const mysqlPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fuelsystem_db',
    waitForConnections: true,
    connectionLimit: 10
  });

  console.log('Migrating data from SQLite to MySQL...');
  
  // Helper to promisify sqlite callback
  function sqliteAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async function migrateTable(tableName, fields, logMsg) {
    try {
      const data = await sqliteAll(`SELECT ${fields.join(',')} FROM ${tableName}`);
      for (const row of data) {
        const values = fields.map(field => row[field] || null);
        await mysqlPool.execute(`INSERT IGNORE INTO ${tableName} (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, values);
      }
      console.log(`${logMsg}: ${data.length} rows`);
    } catch (err) {
      console.error(`${logMsg} error:`, err.message);
    }
  }

  // Migrate tables sequentially
  await migrateTable(
    'users',
    ['id', 'email', 'password', 'name', 'role', 'created_at'],
    'Users migrated'
  );

  await migrateTable(
    'tickets',
    ['id', 'plate_number', 'driver_name', 'destination', 'status', 'riv_id', 'fuel_qty', 'date', 'batch_id', 'cost', 'user_id', 'authorized_passengers', 'purpose', 'created_at'],
    'Tickets migrated'
  );

  await migrateTable(
    'rivs',
    ['id', 'ticket_id', 'riv_no', 'riv_number', 'date', 'office', 'additional_data'],
    'RIVs migrated'
  );

  await migrateTable(
    'travels',
    ['id', 'ticket_id', 'purpose', 'distance'],
    'Travels migrated'
  );

  sqliteDb.close();
  await mysqlPool.end();
  console.log('\\nMigration complete!');
  console.log('Next: del fuel_system.db');
  console.log('Then: npm start');
  console.log('Test login: admin@cao.gov.ph / password123');
}

migrate().catch(console.error);
