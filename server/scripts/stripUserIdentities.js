require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/userModel");

const stripIdentities = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Remove identifying fields from all users
    const result = await User.updateMany(
      {},
      {
        $unset: {
          name: "",
          pic: "",
          isAdmin: "",
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} users`);
    console.log("Removed fields: name, pic, isAdmin");
    console.log("Stripped to: email, password, _id, timestamps");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

stripIdentities();
