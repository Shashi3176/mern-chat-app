const mongoose = require("mongoose");
const connectDB = require("../config/db");
const AnonymousName = require("../models/anonymousNameModel");
const { getRandomizedPool } = require("../utils/anonymousNames");

const seedAnonymousNames = async () => {
  try {
    await connectDB();

    const pool = getRandomizedPool();
    const documents = pool.map((name) => ({
      name,
      isAvailable: true,
      assignedTo: null,
    }));

    await AnonymousName.insertMany(documents, { ordered: false });

    console.log(`Seeded ${pool.length} anonymous names.`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding anonymous names:", error.message);
    process.exit(1);
  }
};

seedAnonymousNames();
