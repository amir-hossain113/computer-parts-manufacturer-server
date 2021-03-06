const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xqjsu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
      if(!authHeader){
          return res.status(401).send({message: 'UnAuthorized Access'})
      }
      const token = authHeader.split(' ')[1]; 
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
        if(err){
          return res.status(403).send({message: 'Forbidden Access'})
        }
        req.decoded = decoded;
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
        const paymentCollection = client.db("computerPartsDb").collection("payments");

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
              next();
            }
            else {
              res.status(403).send({ message: 'forbidden' });
            }
        }

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

        app.post('/product', async(req, res) => {
            const productData = req.body;
            const cursor = await productCollection.insertOne(productData);
            res.send(cursor);
        })

        app.post('/create-payment-intent', verifyJWT, async(req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
        })


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


        app.get('/order/allOrder', async(req, res) => {
            const query = {}
            const orders = await orderCollection.find(query).toArray()
            res.send(orders);
        })


        app.get('/order/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await orderCollection.findOne(query);
            res.send(order);
        });



        app.patch('/order/:id', verifyJWT, async(req, res) => {
            const id = req.params.id;
            payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);
        })




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
        });

        app.get('/admin/:email', async(req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin})
        })


        app.put('/user/admin/:email',verifyJWT,verifyAdmin, async(req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({email: requester})
            if(requesterAccount.role === 'admin'){
                const filter = {email: email};
                const updateDoc = {
                $set : {role: 'admin'},
              }
              const result = await userCollection.updateOne(filter, updateDoc)
              res.send(result);
            }
            else{
                res.status(403).send({message: 'Forbidden Access'})
            }
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