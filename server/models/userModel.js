const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, index: true },
    password: { type: String, required: true },
    anonymousName: { type: mongoose.Schema.Types.ObjectId, ref: "AnonymousName" },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ anonymousName: 1 });

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Prevent anonymous name spoofing - ensure name is updated only server-side
userSchema.methods.setAnonymousName = async function(nameId) {
  this.anonymousName = nameId;
  return this.save();
};

const User = mongoose.model("User", userSchema);

module.exports = User;