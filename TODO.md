# PostgreSQL + Render Deployment TODO

## Plan Overview
Prepare Node.js/Express app for Render deployment using provided PostgreSQL DB:
- Switch from MySQL (InfinityFree) to PostgreSQL via DATABASE_URL
- Use `pg` driver, parse env URL
- Adapt schema/queries for Postgres
- Cleanup legacy SQLite/MySQL migration files
- Update package.json, test, deploy instructions

## Steps (Mark [x] when done)

### Phase 1: Dependencies & Cleanup
- [x] Step 1: Update package.json (add pg, remove sqlite3)
- [x] Step 2: Delete legacy files (fuel_system.db, scripts/migrate.js, models/database.js.backup)

### Phase 2: Database Layer
- [x] Step 3: Rewrite models/database.js for PostgreSQL (parse DATABASE_URL, pg.Pool, adapt schema/queries)
- [ ] Step 4: Test db.init() locally (requires local Postgres + DATABASE_URL env)

### Phase 3: App Updates & Testing
- [ ] Step 5: Minor server.js updates (error handling)
- [ ] Step 6: Update scripts/seed.js if needed
- [ ] Step 7: `npm install`, test locally (`npm start`, check login/dashboard)

### Phase 4: Deployment Prep
- [ ] Step 8: Update README.md with Render deploy instructions
- [ ] Step 9: Full test on Render (deploy, seed data, verify CRUD/reports)

**Current Progress: Ready for Step 1**

**Next Action: npm install after deps update**

