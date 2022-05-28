const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xqjsu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    console.log(req.headers.authorization)
      if(!authHeader){
          return res.status(401).send({message: 'UnAuthorized Access'})
      }
      const token = authHeader.split(' ')[1]; 
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
        if(err){
          return res.status(403).send({message: 'Forbidden Access'})
        }
        req.decoded = decoded;
        console.log("decoded", req.decoded)
        next();
      })
  }

async function run(){
    try{
        await client.connect();
        const productCollection = client.db("computerPartsDb").collection("products");
        const orderCollection = client.db("computerPartsDb").collection("orders");
        const reviewCollection = client.db("computerPartsDb").collection("review");
        const contactCollection = client.db("computerPartsDb").collection("contact");
        const userCollection = client.db("computerPartsDb").collection("user");

        app.get('/product', async(req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.get('/product/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const product = await productCollection.findOne(query);
            res.send(product);
        });

    

        app.get('/order/myOrder/:email',verifyJWT, async(req,res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            if(email === decodedEmail){
                const query = {email: email};
                const cursor = await orderCollection.find(query).toArray();
                return res.send(cursor);
            }
            else{
                return res.status(403).send({message: 'Forbidden Access'})
            }
        });



        app.post('/order', async(req,res) => {
            const orders = req.body;
            const result = await orderCollection.insertOne(orders);
            res.send(result);
        });

        app.post('/review', async(req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        app.get('/review', async(req, res) => {
            const query = {}
            const review = await reviewCollection.find(query).toArray()
            res.send(review);
        });

        app.get('/user', async(req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.put('/user/admin/:email', async(req, res) => {
            const {email} = req.params;
            const filter = {email};
            const updateDoc = {
            $set : {role: 'admin'},
          }
          const result = await userCollection.updateOne(filter, updateDoc)
          res.send(result);
        });

        app.put('/user/:email', async(req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = {email: email};
            const options = { upsert : true};
            const updateDoc = {
            $set : user,
          }
          const result = await userCollection.updateOne(filter, updateDoc, options)
        //   res.send(result);
          const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h'})
          res.send({result, token});
        });

        app.get('/user/:email', async(req, res) => {
            const {email} = req.params;
            const filter = {email};
            const result = await userCollection.findOne(filter);
            res.send(result);

        });

        

        app.post('/contact', async(req, res) => {
            const contact = req.body;
            const cursor = await contactCollection.insertOne(contact);
            res.send(cursor)
        })

        app.delete('/order/myOrder/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })
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