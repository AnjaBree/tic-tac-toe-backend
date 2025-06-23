"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const GameRoomSchema = new mongoose_1.Schema({
    _id: { type: String },
    board: { type: [String], default: Array(9).fill(null) },
    players: { type: [String], default: [] },
    turn: { type: String, enum: ['X', 'O'], default: 'X' }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('GameRoom', GameRoomSchema);
