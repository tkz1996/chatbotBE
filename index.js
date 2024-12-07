const express = require('express');

const app = express();

app.get('/test', (request, response) => {
    response.status(204).send('success');
});

var port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App available on http://localhost:%d`, port));