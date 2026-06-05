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
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

roomParticipantSchema.index({ room: 1, isActive: 1 });
roomParticipantSchema.index({ user: 1, isActive: 1 });
roomParticipantSchema.index({ room: 1, user: 1 }, { unique: true });

const RoomParticipant = mongoose.model("RoomParticipant", roomParticipantSchema);

module.exports = RoomParticipant;