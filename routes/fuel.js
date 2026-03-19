const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Middleware to check for authentication
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// Middleware to check for Admin role
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).send('<h1>403 Forbidden</h1><p>You do not have permission to perform this action.</p><a href="/dashboard">Back to Dashboard</a>');
}

router.use(isAuthenticated);

// Redirect root to dashboard to ensure data loading
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const allTickets = await db.getAllTripTickets();
    const vehicles = await db.getAllVehicles();
    const drivers = await db.getAllDrivers();
    const nextRiv = await db.getNextRivNumber();
    
    const pendingTickets = allTickets.filter(t => t.status === 'Pending');
    const completedTickets = allTickets.filter(t => t.status === 'Completed');
    
    const stats = {
      pending: pendingTickets.length,
      completed: completedTickets.length,
      vehicles: vehicles.length,
      drivers: drivers.length
    };
    
    const recentActivity = completedTickets.slice(0, 5);

    res.render('index', {
      title: 'Dashboard',
      stats,
      pendingTrips: pendingTickets,
      recentActivity,
      vehicles,
      drivers,
      user: req.session.user,
      search: '',
      nextRiv,
      action: req.query.action
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- RIVs ---
router.get('/fuel-rivs', async (req, res) => {
  try {
    const rivs = await db.getAllFuelRivs();
    res.render('rivs', { title: 'Fuel RIVs', rivs, user: req.session.user });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post('/fuel-rivs', async (req, res) => {
  try {
    // Basic validation
    if (!req.body.riv_no || !req.body.date) {
      throw new Error('RIV # and Date are required.');
    }
    const rivData = {
        riv_no: req.body.riv_no,
        office: req.body.office,
        date: req.body.date,
        items: req.body.items // Assuming items are sent in the body e.g. [{ fuel_type: 'Diesel', quantity_liters: 100 }]
    };
    
    // If items are coming from a form as individual fields, we might need to parse them.
    // For this implementation, we assume the frontend sends a structured request or we validate existence.
    await db.createFuelRiv(rivData);
    res.redirect('/fuel-rivs');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.get('/fuel-rivs/:id/print', async (req, res) => {
    try {
        const riv = await db.getFuelRivWithItems(req.params.id);
        if (!riv) return res.status(404).send('RIV not found');

        // Fetch associated trip tickets to get plate number
        const tickets = await db.getTripTicketsByRivId(req.params.id);
        const plate_number = tickets.length > 0 ? tickets[0].plate_number : '';

        // Fetch officials for signatures
        const officials = await db.getAllOfficials();
        const officialsByPosition = {};
        officials.forEach(o => {
            // Normalize position keys: 'city_accountant', 'requisitioning_officer', etc.
            // This requires your DB to have officials with these specific positions or we map them.
            // For now, using logic similar to previous ticket print:
            const key = o.position.toLowerCase().replace(/\./g, '').replace(/\s+/g, '_');
            officialsByPosition[key] = o;
        });

        res.render('print_riv', { 
            layout: false, 
            riv, 
            plate_number, 
            officialsByPosition 
        });
    } catch(err) {
        res.status(500).send(err.message);
    }
});

router.get('/fuel-rivs/:id', async (req, res) => {
    try {
        const riv = await db.getFuelRivWithItems(req.params.id);
        if (!riv) return res.status(404).send('RIV not found');
        res.render('riv', { title: `RIV ${riv.riv_no}`, riv, user: req.session.user });
    } catch(err) {
        res.status(500).send(err.message);
    }
});


// --- Vehicles, Drivers, Officials (CRUD) ---
const crudRoutes = [
    { path: 'vehicles', getAll: db.getAllVehicles, create: db.createVehicle, update: db.updateVehicle, delete: db.deleteVehicle },
    { path: 'drivers', getAll: db.getAllDrivers, create: db.createDriver, update: db.updateDriver, delete: db.deleteDriver },
    { path: 'officials', getAll: db.getAllOfficials, create: db.createOfficial, update: db.updateOfficial, delete: db.deleteOfficial }
];

crudRoutes.forEach(route => {
    // GET list
    router.get(`/${route.path}`, async (req, res) => {
        try {
            const items = await route.getAll();
            res.render(route.path, { title: route.path.charAt(0).toUpperCase() + route.path.slice(1), items, user: req.session.user });
        } catch (err) {
            res.status(500).send(err.message);
        }
    });

    // POST create
    router.post(`/${route.path}`, isAdmin, async (req, res) => {
        try {
            await route.create(req.body);
            res.redirect(`/${route.path}`);
        } catch (err) {
            res.status(400).send(err.message);
        }
    });
    
    // POST update
    router.post(`/${route.path}/:id/update`, isAdmin, async (req, res) => {
        try {
            await route.update(req.params.id, req.body);
            res.redirect(`/${route.path}`);
        } catch (err) {
            res.status(400).send(err.message);
        }
    });

    // POST delete
    router.post(`/${route.path}/:id/delete`, isAdmin, async (req, res) => {
        try {
            await route.delete(req.params.id);
            res.redirect(`/${route.path}`);
        } catch (err) {
            res.status(500).send(err.message);
        }
    });
});


// --- Trip Tickets ---
router.get('/trip-tickets', async (req, res) => {
  try {
    const tickets = await db.getAllTripTickets();
    res.render('tickets', { title: 'Trip Tickets', tickets, user: req.session.user });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post('/trip-tickets', async (req, res) => {
    try {
        await db.createTripTicketWithRiv(req.body);
        res.redirect('/trip-tickets');
    } catch (err) {
        res.status(400).send(err.message);
    }
});

router.get('/trip-tickets/:id/print', async (req, res) => {
    try {
        const ticket = await db.getTripTicketById(req.params.id);
        if(!ticket) return res.status(404).send('Ticket not found');
        
        // Fetch RIV details if available
        let riv = null;
        if (ticket.fuel_riv_id) {
            riv = await db.getFuelRivWithItems(ticket.fuel_riv_id);
        }

        // Fetch all logs
        const logs = await db.getTripLogsByTicketId(req.params.id) || [];
        
        // Fetch officials for signatures and organize by position key (e.g., 'city_mayor')
        const officials = await db.getAllOfficials();
        const officialsByPosition = {};
        officials.forEach(o => {
            const key = o.position.toLowerCase().replace(/\./g, '').replace(/\s+/g, '_');
            officialsByPosition[key] = o;
        });

        res.render('print_ticket', { 
            layout: false, // Disable main layout
            ticket, 
            riv, 
            logs, 
            officialsByPosition
        });
    } catch(err) {
        res.status(500).send(err.message);
    }
});

router.get('/trip-tickets/:id', async (req, res) => {
    try {
        const ticket = await db.getTripTicketById(req.params.id);
        if(!ticket) return res.status(404).send('Ticket not found');
        
        // Fetch RIV details if available
        let riv = null; // Default to null
        if (ticket.fuel_riv_id) {
            riv = await db.getFuelRivWithItems(ticket.fuel_riv_id);
        }

        // Fetch all logs
        const logs = await db.getTripLogsByTicketId(req.params.id) || [];
        
        res.render('ticket', { 
            title: `Ticket ${ticket.id}`, 
            ticket, 
            riv, 
            logs, 
            user: req.session.user 
        });
    } catch(err) {
        res.status(500).send(err.message);
    }
});

router.post('/trip-tickets/:id/update-status', async (req, res) => {
    try {
        await db.updateTripTicketStatus(req.params.id, req.body.status);
        res.redirect(`/trip-tickets/${req.params.id}`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/trip-tickets/:id/add-log', async (req, res) => {
    try {
        await db.createTripLog({ trip_ticket_id: req.params.id, ...req.body });
        res.redirect(`/trip-tickets/${req.params.id}`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/trip-tickets/:id/update-consumption', async (req, res) => {
    try {
        const logs = await db.getTripLogsByTicketId(req.params.id);
        if (logs.length > 0) {
            // Consolidate consumption data: Clear consumption from previous logs
            // to ensure it only exists on the latest log (Singleton behavior)
            if (logs.length > 1) {
                const cleanData = {
                    gasoline_used: 0, gasoline_excess: 0, gasoline_purchased_outside: 0,
                    oil_used: 0, grease_used: 0, brake_fluid_used: 0, gear_oil_used: 0,
                    balance_in_tank_start: 0, balance_in_tank_end: 0
                };
                for (let i = 0; i < logs.length - 1; i++) {
                    await db.updateTripLog(logs[i].id, cleanData);
                }
            }
            // Update the last log entry with new consumption data
            await db.updateTripLog(logs[logs.length - 1].id, req.body);
        } else {
            await db.createTripLog({ trip_ticket_id: req.params.id, ...req.body });
        }
        res.redirect(`/trip-tickets/${req.params.id}`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- Trip Logs ---
router.post('/trip-logs', async (req, res) => {
    try {
        const logData = req.body;
        
        // Input Validation
        const numericFields = ['odo_ending', 'gasoline_used', 'gasoline_issued', 'gasoline_purchased_outside'];
        for (const field of numericFields) {
             if (logData[field] && isNaN(parseFloat(logData[field]))) {
                 throw new Error(`Invalid format for ${field.replace('_', ' ')}. Must be a number.`);
             }
        }

        // Calculation: excess = issued + outside - used
        logData.gasoline_excess = (parseFloat(logData.gasoline_issued) || 0) + (parseFloat(logData.gasoline_purchased_outside) || 0) - (parseFloat(logData.gasoline_used) || 0);

        await db.createTripLog(logData);
        // Mark ticket as complete
        await db.updateTripTicketStatus(logData.trip_ticket_id, 'Completed');
        res.redirect(`/trip-tickets/${logData.trip_ticket_id}`);
    } catch (err) {
        res.status(400).send(err.message);
    }
});


// --- Reports ---
router.get('/reports', async (req, res) => {
  try {
    const { driver, month, year } = req.query;
    let reports = [];
    
    // Default to current month/year if not provided
    const reportMonth = month || new Date().getMonth() + 1;
    const reportYear = year || new Date().getFullYear();

    reports = await db.generateMonthlyReport(reportMonth, reportYear);
    res.render('reports', { title: 'Reports', reports, user: req.session.user });
  } catch (err) {
    res.status(500).send(err.message);
  }
});


module.exports = router;
