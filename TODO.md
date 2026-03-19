# Node.js Fuel System Transformation - Detailed Implementation Plan

## Approved Plan Overview
Transform existing partial Node.js app to match exact SQL schema (fuelsystem_db). Implement full flow: RIVs → Items → Trip Tickets → Logs → Reports.

**Current Status:** ✅ Plan approved. Starting implementation.

## Breakdown Steps (Complete sequentially):

### Phase 1: Database Schema (Priority 1)
1. [✅] **Update models/database.js**: Replace init() with exact SQL schema (all 8 tables + indexes/FKs). Add sample data inserts matching SQL dump. Ensure MySQL compatible (InnoDB, utf8mb4_unicode_ci).
2. [✅] **Test DB**: Execute `node -e "require('./models/database').init().then(() => { console.log('✅ DB Ready - Schema created with samples'); process.exit(0); }).catch(e => { console.error('❌ Error:', e); process.exit(1); })"` → Verify tables/data.

### Phase 2: Core Models & Helpers
3. [✅] **Create model helpers**: Add functions in database.js for CRUD per table (getRIVs, createTripTicket, etc.).
4. [✅] **Update server.js**: Ensure db.init() called on start.

### Phase 3: Routes & API (Rewrite fuel.js)
5. [✅] **routes/fuel.js rewrite**:
   - GET/POST /fuel-rivs (with nested items)
   - GET/POST /vehicles, /drivers, /officials
   - GET/POST /trip-tickets (link to RIV)
   - GET/POST /trip-logs (calculations: excess = issued + outside - used)
   - GET /reports?driver=...&month=...&year=...
6. [✅] **Dashboard updates**: Overview stats, pending tickets/logs.

**Next Step:** Proceed to Phase 4.

### Phase 4: Views/UI
7. [✅] **Update existing views**: index.ejs (dashboard), tickets.ejs → trip-tickets.ejs, riv.ejs → fuel-rivs.ejs.
8. [✅] **New views**: vehicles.ejs, drivers.ejs, officials.ejs, trip-logs.ejs, reports.ejs.
9. [✅] **Forms**: RIV items table (fuel types), log calc fields, dropdowns (vehicles/drivers).

### Phase 5: Polish & Test
10. [x] **Print CSS**: Update style.css for all printables.
11. [x] **Auth/Validation**: Role checks, input validation.
12. [x] **Seed & Test**: Full sample data, end-to-end flow, reports.
13. [x] **attempt_completion**: Demo commands.

## Progress Tracking
- Complete each step → Update checklist with [x].
- After each phase → Test `npm start`, manual verification.
- Total: 13 steps.
