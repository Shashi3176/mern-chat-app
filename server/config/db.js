const mongoose = require("mongoose");
const colors = require("colors");
const AnonymousName = require("../models/anonymousNameModel");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);

    const poolCount = await AnonymousName.countDocuments();
    if (poolCount === 0) {
      console.log(
        "AnonymousName pool is empty. Run: npm run seed:anonymous-names".yellow.bold
      );
    } else if (poolCount < 1000) {
      console.log(
        `Warning: AnonymousName pool has only ${poolCount} names (expected 1000)`.yellow.bold
      );
    }
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

module.exports = connectDB;

