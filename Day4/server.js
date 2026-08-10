const express = require('express');
const { Pool } = require('pg');

const port = process.env.PORT || 3000;
const app = express();

// node-postgres reads PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE automatically.
const pool = new Pool();

async function waitForDb(retries = 10, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await pool.query('SELECT 1');
            console.log('Connected to Postgres');
            return;
        } catch (err) {
            console.log(`DB not ready yet (attempt ${attempt}/${retries}): ${err.message}`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    throw new Error('Could not connect to Postgres after retries');
}

async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS visits (
            id SERIAL PRIMARY KEY,
            visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
}

app.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'INSERT INTO visits DEFAULT VALUES RETURNING id, visited_at'
        );
        const { id, visited_at } = result.rows[0];
        console.log(`${new Date().toISOString()} GET / -> visit #${id}`);
        res.type('text/plain').send(
            `Hello World! You are visit number ${id} (recorded at ${visited_at})\n`
        );
    } catch (err) {
        console.error('DB write failed:', err.message);
        res.status(500).type('text/plain').send('Database error\n');
    }
});

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        res.status(503).json({ status: 'error', message: err.message });
    }
});

// Test-only: lets us exercise the container's restart policy on demand.
// A signal sent from outside the container (docker kill/stop) is treated
// as intentional and does not trigger restart:on-failure; this simulates a
// genuine in-process crash instead, which does.
app.get('/crash', (req, res) => {
    res.status(200).send('crashing now\n');
    setTimeout(() => process.exit(1), 100);
});

waitForDb()
    .then(initDb)
    .then(() => {
        app.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    })
    .catch((err) => {
        console.error('Fatal startup error:', err.message);
        process.exit(1);
    });
