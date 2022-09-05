import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import joi from 'joi';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(async () => {
    db = await mongoClient.db('batepapouol')
});


const userSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message','private_message').required()
});

server.post('/participants', async (req, res) => {
    const user = req.body;
    let users;

    try{
        users = await db.collection("participantes").find().toArray();
        console.log(users);
    }
    catch{
        res.sendStatus(500);
        return;
    }

    const checkUsers = users.find(element => element.name === user.name);
    const validation = userSchema.validate(user);
    const hours = dayjs(Date.now()).format('HH:mm:ss');
    

    if (validation.error) {
        res.status(422).send("name deve ser strings não vazio");
        return;
    }
    if (checkUsers){
        res.sendStatus(409);
        return;
    }

    try{
        const postUser = await db.collection("participantes").insertOne({name: user.name, lastStatus: Date.now()});
        console.log(postUser);
    }
    catch{
        res.sendStatus(500);
        return;
    }

    try{
        const postMessage = await db.collection("mensagem").insertOne({from: user.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hours});
        console.log(postMessage);
    }
    catch{
        res.sendStatus(500);
        return;
    }

    

    res.sendStatus(201);
});

server.get('/participants', async (req, res) => {
    let mongoData;
    let users = [];

    try {
       mongoData = await db.collection("participantes").find().toArray()
       mongoData.map((data)=>{
        users = [...users,
            {name: data.name}
       ]
       })
    } catch {
        
    }

    res.send(users);
});

server.post('/messages', async (req,res) => {
    const message = req.body;
    const user = req.headers.user;
    const validateMessage = messageSchema.validate(message);
    

    if(validateMessage.error) {
        res.status(422).send("preencha corretamente os campos");
        return;
    }
    
    res.send("ok");    
})



server.listen(5000, function () {
    console.log("listen on 5000")
    console.log(dayjs(Date.now()).format('HH:mm:ss'))
})