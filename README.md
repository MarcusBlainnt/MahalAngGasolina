# CAO Fuel System (Node.js)

A web-based system for managing fuel RIVs, Trip Tickets, and Trip Logs for the City Accounting Office.

## Features

- **Role-Based Access**: Admin and User roles.
- **Master Data Management**: CRUD for Vehicles, Drivers, and Officials (Admin only).
- **Transaction Flow**: 
  1. Create Fuel RIV (Request for Inspection Voucher)
  2. Create Trip Ticket linked to RIV
  3. Log Trip details (Departure/Arrival, Odometer, Fuel Usage)
- **Reporting**: Monthly summary of trips and fuel consumption (Print-ready).

## Prerequisites

- Node.js (v14+)
- MySQL Server

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Database**:
   - Update `models/database.js` with your MySQL credentials (host, user, password, database).
   - Ensure the MySQL server is running.

3. **Seed Database**:
   Run the seed script to create the schema and populate it with sample data.
   ```bash
   node scripts/seed.js
   ```
   *Note: This will drop existing tables named `trip_logs`, `trip_tickets`, `fuel_riv_items`, `fuel_rivs`, `vehicles`, `officials`, `drivers`, and `users`.*

4. **Start the Application**:
   ```bash
   npm start
   ```
   or
   ```bash
   node server.js
   ```

5. **Access the App**:
   Open http://localhost:3000 in your browser.

## Default Credentials

| Role  | Email              | Password      |
|-------|--------------------|---------------|
| Admin | admin@cao.gov.ph   | password123   |
| User  | mcadmin@gmail.com  | (hashed)      |

## Printing Reports

The system includes a dedicated print stylesheet. To print a report, navigate to the **Reports** page, filter by month/year, and use your browser's Print function (Ctrl+P). The navigation bar and buttons will be automatically hidden.