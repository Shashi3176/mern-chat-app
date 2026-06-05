const mongoose = require("mongoose");

const anonymousNameSchema = mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    isAvailable: { type: Boolean, default: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

anonymousNameSchema.index({ name: 1 }, { unique: true });
anonymousNameSchema.index({ isAvailable: 1 });

const AnonymousName = mongoose.model("AnonymousName", anonymousNameSchema);

module.exports = AnonymousName;
