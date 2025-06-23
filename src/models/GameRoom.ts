import { Schema, model, Document } from 'mongoose';

interface IGameRoom extends Document {
  _id: string;               // room ID
  board: (string | null)[];  // 9‑cell array
  players: string[];         // socket IDs
  turn: 'X' | 'O';
}

const GameRoomSchema = new Schema<IGameRoom>(
  {
    _id: { type: String },
    board: { type: [String], default: Array(9).fill(null) },
    players: { type: [String], default: [] },
    turn: { type: String, enum: ['X', 'O'], default: 'X' }
  },
  { timestamps: true }
);

export default model<IGameRoom>('GameRoom', GameRoomSchema);
