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
    type: joi.string().valid('message', 'private_message').required()
});


server.post('/participants', async (req, res) => {
    let onlineUsers;
    const user = req.body;

    try {
        onlineUsers = await db.collection("participantes").find().toArray();
    }
    catch {
        res.sendStatus(500);
        return;
    }

    const checkUsers = onlineUsers.find(element => element.name === user.name);
    const validation = userSchema.validate(user);
    const hours = dayjs(Date.now()).format('HH:mm:ss');


    if (validation.error) {
        res.status(422).send("name deve ser strings não vazio");
        return;
    }
    if (checkUsers) {
        res.sendStatus(409);
        return;
    }

    try {
        const postUser = await db.collection("participantes").insertOne({ name: user.name, lastStatus: Date.now() });
    }
    catch {
        res.sendStatus(500);
        return;
    }

    try {
        const postMessage = await db.collection("mensagem").insertOne({ from: user.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hours });
    }
    catch {
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
        mongoData.map((data) => {
            users = [...users,
            { name: data.name }
            ]
        })
    } catch {
        res.sendStatus(500);
        return;
    }

    res.send(users);
});

server.post('/messages', async (req, res) => {
    const message = req.body;
    const user = req.headers.user;
    const validateMessage = messageSchema.validate(message);
    const hours = dayjs(Date.now()).format('HH:mm:ss');
    let checkUser;

    if (validateMessage.error) {
        res.status(422).send("preencha corretamente os campos");
        return;
    }

    try {
        checkUser = await db.collection("participantes").findOne({ name: user });

        if (checkUser === null) {
            res.status(422).send("preencha corretamente os campos");
            return;
        }
    }
    catch {
        res.sendStatus(500);
        return;
    }

    try {
        const postMessage = await db.collection("mensagem").insertOne({ from: user, to: message.to, text: message.text, type: message.type, time: hours });
        res.sendStatus(201);
        return
    } catch (error) {
        res.sendStatus(500);
        return;
    }

});

server.get('/messages', async (req, res) => {
    const limit = req.query.limit;
    const user = req.headers.user;
    let messages;

    try {
        messages = await db.collection("mensagem").find().toArray();
    } catch {
        res.sendStatus(500);
        return;
    }

    let filteredMessages = messages.filter((message) => {
        if (message.to === "Todos" || message.from === user || message.to === user) {
            return true
        }
        return false
    })

    const limitedMessages = filteredMessages.slice(-limit);
    res.send(limitedMessages)

})

server.post('/status', async (req, res) => {
    const user = req.headers.user;
    let checkUser;

    try {
        checkUser = await db.collection("participantes").findOne({ name: user });

        if (checkUser === null) {
            res.sendStatus(404);
            return;
        }

        checkUser = {
            ...checkUser,
            lastStatus: Date.now()
        }

        await db.collection("participantes").updateOne({
            _id: checkUser._id
        }, { $set: checkUser })

    }
    catch {
        res.sendStatus(500);
        return;
    }


    res.sendStatus(200);
})

async function statusCheck() {
    let users;
    let deleteUser, deletedUserMessage;

    try {
        users = await db.collection("participantes").find().toArray()

        users.forEach(async (user) => {
            if (Math.round(user.lastStatus / 1000 + 10) < Math.round(Date.now() / 1000.0)) {
                deleteUser = await db.collection("participantes").deleteOne(user)

                
                deletedUserMessage = await db.collection("mensagem").insertOne({
                    from: user.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs(Date.now()).format('HH:mm:ss')
                })
            }
        })

    } catch {
        return;
    }


}

setInterval(statusCheck, 15000)

server.listen(5000, function () {
    console.log("listen on 5000")
})