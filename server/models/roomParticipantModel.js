const mongoose = require("mongoose");

const roomParticipantSchema = mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnonymousRoom",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["member", "admin", "moderator"],
      default: "member",
    },
    joinedAt: { type: Date, default: Date.now, index: true },
    leftAt: { type: Date, default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Indexes for common queries
roomParticipantSchema.index({ room: 1, isActive: 1 });
roomParticipantSchema.index({ user: 1, isActive: 1 });
roomParticipantSchema.index({ room: 1, user: 1 }, { unique: true });
roomParticipantSchema.index({ user: 1, isActive: 1, room: 1 });

const RoomParticipant = mongoose.model("RoomParticipant", roomParticipantSchema);

module.exports = RoomParticipant;