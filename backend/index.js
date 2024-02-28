const express = require('express');
const app = express();
const chats = require('./data/data');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(cors());

dotenv.config();
connectDB();

app.use(express.json()); // to accept json data from frontend

// ---------development-------------
// app.get('/', (req, res) => {
//     res.send('API is running successfully');
// })
// ---------development-------------

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

// -------------Deployment----------------
const __dirname1 = path.resolve();
if (process.env.NODE_ENV === 'production') {

    app.use(express.static(path.join(__dirname1, './frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname1, "./frontend", "dist", "index.html"));
    })
}
else {
    app.get('/', (req, res) => {
        res.send('API is running successfully');
    })
}

// -------------Deployment----------------

app.use(notFound)
app.use(errorHandler)

app.get('/api/chat/:id', (req, res) => {
    const { id } = req.params
    const singleChat = chats.find((c) => c._id === id);
    res.send(singleChat);
})


const PORT = process.env.PORT || 8800;
const server = app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}`);
})

const io = require('socket.io')(server, {
    pingTimeout: 60000,
    cors: {
        origin: "https://varta-app-api.vercel.app",
        credentials: true
    },
});

io.on("connection", (socket) => {
    console.log("connected to socket.io");

    socket.on('setup', (userData) => {
        socket.join(userData._id);
        // console.log(userData._id);
        socket.emit('connected');
    })

    socket.on('join chat', (room) => {
        socket.join(room);
        // console.log('User Joined Room: ' + room);
    })

    socket.on('typing', (room) => socket.in(room).emit("typing"));
    socket.on('stop typing', (room) => socket.in(room).emit("stop typing"));

    socket.on('new message', (newMessageReceived) => {
        let chat = newMessageReceived.chat;

        if (!chat.users) {
            return console.log('chat.users not defined');
        }

        chat.users.forEach(user => {
            if (user._id == newMessageReceived.sender._id) {
                return;
            }

            socket.in(user._id).emit("message received", newMessageReceived);

        })
    })

    socket.off('setup', () => {
        // console.log('USER DISCONNECTED');
        socket.leave(userData._id);
    });
})