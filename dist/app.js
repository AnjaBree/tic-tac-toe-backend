"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const socket_io_1 = require("socket.io");
const GameRoom_1 = __importDefault(require("./models/GameRoom"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 5000;
// Connect to MongoDB
mongoose_1.default
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('DB connection error', err));
io.on('connection', socket => {
    // Join or create a room
    socket.on('join', (roomId) => __awaiter(void 0, void 0, void 0, function* () {
        let room = yield GameRoom_1.default.findById(roomId);
        if (!room) {
            room = new GameRoom_1.default({ _id: roomId });
            yield room.save();
        }
        if (room.players.length >= 2) {
            socket.emit('full');
            return;
        }
        room.players.push(socket.id);
        yield room.save();
        socket.join(roomId);
        const symbol = room.players.length === 1 ? 'X' : 'O';
        socket.emit('joined', { symbol });
        io.to(roomId).emit('state', room);
    }));
    // Handle a move
    socket.on('play', (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { roomId, index, symbol } = data;
        const room = yield GameRoom_1.default.findById(roomId);
        if (!room || room.turn !== symbol || room.board[index])
            return;
        // Apply the move
        room.board[index] = symbol;
        room.turn = symbol === 'X' ? 'O' : 'X';
        // Check for win or draw
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        const winnerLine = lines.find(line => line.every(i => room.board[i] === symbol));
        const winner = winnerLine ? symbol : null;
        if (winner || room.board.every(cell => cell !== null)) {
            io.to(roomId).emit('state', room);
            io.to(roomId).emit('gameOver', { winner, disconnected: false });
            yield GameRoom_1.default.findByIdAndDelete(roomId);
            return;
        }
        yield room.save();
        io.to(roomId).emit('state', room);
    }));
    // Handle disconnect
    socket.on('disconnecting', () => __awaiter(void 0, void 0, void 0, function* () {
        for (const roomId of socket.rooms) {
            if (roomId === socket.id)
                continue;
            const room = yield GameRoom_1.default.findById(roomId);
            if (room) {
                const loserIndex = room.players.indexOf(socket.id);
                const winnerSym = loserIndex === 0 ? 'O' : 'X';
                io.to(roomId).emit('gameOver', { winner: winnerSym, disconnected: true });
                yield GameRoom_1.default.findByIdAndDelete(roomId);
            }
        }
    }));
});
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
