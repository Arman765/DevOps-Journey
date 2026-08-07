const express = require('express');

const port = process.env.PORT;
const app = express();

app.get('/', (req, res) => {
    console.log(`${new Date().toISOString()} GET /`);
    res.type('text/plain').send('Hello World\n');
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
