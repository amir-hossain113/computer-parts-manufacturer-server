const express = require('express');
const app = express();
const port = process.env.PORT || 5000;



app.get('/', (req, res) => {
    res.send('Welcome to Computer Parts Manufacturer');
});

app.listen(port, () => {
    console.log(`Computer Parts Manufacturer is Running on port ${port}`);
});