const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xqjsu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        await client.connect();
        const productCollection = client.db("computerPartsDb").collection("products");

    }
    finally{

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Welcome to Computer Parts Manufacturer');
});

app.listen(port, () => {
    console.log(`Computer Parts Manufacturer is Running on port ${port}`);
});