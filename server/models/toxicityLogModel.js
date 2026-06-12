const mongoose = require("mongoose");

const toxicityLogSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "AnonymousRoom" },
    messageContent: { type: String, maxlength: 100 },
    detectedCategories: [{ type: String }],
    confidenceScores: { type: mongoose.Schema.Types.Mixed },
    confidence: { type: Number, min: 0, max: 1 },
    userAnonymousName: { type: String },
  },
  { timestamps: true }
);

toxicityLogSchema.index({ userId: 1 });
toxicityLogSchema.index({ roomId: 1 });
toxicityLogSchema.index({ createdAt: -1 });

const ToxicityLog = mongoose.model("ToxicityLog", toxicityLogSchema);
module.exports = ToxicityLog;