import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import GameRoom from './models/GameRoom';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('DB connection error', err));

io.on('connection', socket => {
  socket.on('join', async (roomId: string) => {
    let room = await GameRoom.findById(roomId);
    if (!room) {
      room = new GameRoom({ _id: roomId });
      await room.save();
    }
    if (room.players.length >= 2) {
      socket.emit('full');
      return;
    }
    room.players.push(socket.id);
    await room.save();

    socket.join(roomId);
    const symbol = room.players.length === 1 ? 'X' : 'O';
    socket.emit('joined', { symbol });
    io.to(roomId).emit('state', room);
  });

  // Handle a move
  socket.on('play', async (data: { roomId: string; index: number; symbol: 'X' | 'O' }) => {
    const { roomId, index, symbol } = data;
    const room = await GameRoom.findById(roomId);
    if (!room || room.turn !== symbol || room.board[index]) return;

    // Apply the move
    room.board[index] = symbol;
    room.turn = symbol === 'X' ? 'O' : 'X';

    // Check for win or draw
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    const winnerLine = lines.find(line => line.every(i => room.board[i] === symbol));
    const winner = winnerLine ? symbol : null;

    if (winner || room.board.every(cell => cell !== null)) {
      io.to(roomId).emit('state', room);
      io.to(roomId).emit('gameOver', { winner, disconnected: false });
      await GameRoom.findByIdAndDelete(roomId);
      return;
    }

    await room.save();
    io.to(roomId).emit('state', room);
  });

  // Handle disconnect
  socket.on('disconnecting', async () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      const room = await GameRoom.findById(roomId);
      if (room) {
        const loserIndex = room.players.indexOf(socket.id);
        const winnerSym = loserIndex === 0 ? 'O' : 'X';
        io.to(roomId).emit('gameOver', { winner: winnerSym, disconnected: true });
        await GameRoom.findByIdAndDelete(roomId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
