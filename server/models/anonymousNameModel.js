const mongoose = require("mongoose");

const anonymousNameSchema = mongoose.Schema(
  {
    name: { type: String, unique: true, required: true, index: true },
    isAvailable: { type: Boolean, default: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

// Single field indexes
anonymousNameSchema.index({ name: 1 }, { unique: true });
anonymousNameSchema.index({ isAvailable: 1 });
anonymousNameSchema.index({ assignedTo: 1 });

// Compound index for quick available name lookup
anonymousNameSchema.index(
  { isAvailable: 1, createdAt: 1 }
);

const AnonymousName = mongoose.model("AnonymousName", anonymousNameSchema);

module.exports = AnonymousName;