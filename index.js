const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 3000
require('dotenv').config()
const jwt = require('jsonwebtoken')
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.db_username}:${process.env.db_password}@cluster0.oyt4s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const serviceRequestCollection = client.db('Export_Import_Data').collection('serviceRequest')
        const userDataCollection = client.db('Export_Import_Data').collection('userInfo')
        const productsCollection = client.db('Export_Import_Data').collection('ProductsData')
        const servicesCollection = client.db('Export_Import_Data').collection('ServicesData')
        const userCollection = client.db('Export_Import_Data').collection('Users')

        // JWT Token
        app.post('/jwttoken', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res.send({ token })
        })
        // Verify Middle war

        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized Access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized Access' })
                }
                req.decoded = decoded
                next()
            })

        }
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden Access' })

            }
            next()

        }

        // User Related Api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        // Check admin
        app.get('/users/admin/:email',verifyToken, async (req, res) => {
            console.log('this is request decoded', req.decoded.email)
            const email = req.params.email
            console.log(email)
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbbiden Access' })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)

            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingEmail = await userCollection.findOne(query);
            if (existingEmail) {
                return res.send({ message: 'User Already Exist', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const UpdatedDoc = {
                $set: {
                    role: 'admin',
                }
            }
            const result = await userCollection.updateOne(filter, UpdatedDoc)
            res.send(result);
        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result)
        })


        // serviceRequestData related Api

        // Getting user request data
        app.get('/requestData',verifyToken, verifyAdmin, async (req, res) => {
            const result = await serviceRequestCollection.find().toArray()
            res.send(result)
        })

        // Setting user request data in the collection
        app.post('/requestData', async (req, res) => {
            const data = req.body;
            const result = await serviceRequestCollection.insertOne(data);
            if (result.acknowledged) {
                res.send({ success: true, insertedId: result.insertedId });
            } else {
                res.send({ success: false });
            }
        });

        // User contact data related api
        app.get('/contactData',verifyToken, verifyAdmin, async (req, res) => {
            const result = await userDataCollection.find().toArray()
            res.send(result)
        })
        app.post('/contactData', async (req, res) => {
            const data = req.body
            const result = await userDataCollection.insertOne(data)
            if (result.acknowledged) {
                res.send({ success: true, insertedId: result.insertedId });
            } else {
                res.send({ success: false });
            }
        })

        // Products Related Api
        app.get('/products', async (req, res) => {
            const result = await productsCollection.find().toArray()
            res.send(result)
        })
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query)
            res.send(result)

        })
        app.patch('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
            const product = req.body
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const UpdatedDoc = {
                $set: {
                    name: product.name,
                    img: product.img,
                    price: product.price,
                    brand: product.brand,
                    quality: product.quality,
                    description: product.description,
                    madeIn: product.madeIn,
                    availability: product.availability
                }
            }
            const result = await productsCollection.updateOne(query, UpdatedDoc)
            res.send(result)
        })
        app.post('/products', verifyToken, verifyAdmin, async (req, res) => {
            const data = req.body
            const result = await productsCollection.insertOne(data)
            res.send(result)
        })
        app.delete('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.deleteOne(query)
            res.send(result)

        })
        // Services related Api
        app.get('/services', async (req, res) => {
            const result = await servicesCollection.find().toArray()
            res.send(result)
        })
        app.delete('/services/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await servicesCollection.deleteOne(query)
            res.send(result)
        })
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await servicesCollection.findOne(query)
            res.send(result)

        })
        app.post('/services', verifyToken, verifyAdmin, async (req, res) => {
            const data = req.body
            const result = await servicesCollection.insertOne(data)
            res.send(result)
        })
        app.patch('/services/:id', verifyToken, verifyAdmin, async (req, res) => {
            const service = req.body
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    title: service.title,
                    description: service.description,
                    image: service.image
                }
            }
            const result = await servicesCollection.updateOne(query, updatedDoc)
            res.send(result)
        })


    }
    catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Server is running')
})
app.listen(port, () => {
    console.log(`Server is running on ${port}`)
})