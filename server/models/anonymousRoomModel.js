const mongoose = require("mongoose");

const anonymousRoomSchema = mongoose.Schema(
  {
    roomName: { type: String, trim: true },
    roomType: {
      type: String,
      enum: ["group", "direct"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    participantCount: { type: Number, default: 0 },
    maxParticipants: { type: Number, default: 50 },
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true }
);

anonymousRoomSchema.index({ roomType: 1, status: 1 });
anonymousRoomSchema.index({ expiresAt: 1, status: 1 });

anonymousRoomSchema.index(
  { roomType: 1, status: 1, createdAt: -1 },
  { name: "browse_index" }
);

const AnonymousRoom = mongoose.model("AnonymousRoom", anonymousRoomSchema);

module.exports = AnonymousRoom;