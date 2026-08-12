const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

function get(path, port) {
    return new Promise((resolve, reject) => {
        http.get({ hostname: '127.0.0.1', port, path }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({ status: res.statusCode, body });
            });
        }).on('error', reject);
    });
}

test('GET / returns Hello World', async (t) => {
    const server = app.listen(0);
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const { port } = server.address();
    const { status, body } = await get('/', port);

    assert.equal(status, 200);
    assert.equal(body, 'Hello World\n');
});

test('GET /unknown returns 404', async (t) => {
    const server = app.listen(0);
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const { port } = server.address();
    const { status } = await get('/unknown', port);

    assert.equal(status, 404);
});
