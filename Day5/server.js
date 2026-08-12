const express = require('express');

const app = express();

app.get('/', (_req, res) => {
    console.log(`${new Date().toISOString()} GET /`);
    res.type('text/plain').send('Hello World Docker Team is currently working\n');
});

if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

module.exports = app;
