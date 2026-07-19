const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("connectDB() called");

    const mongoUri = process.env.MONGO_URI;
    console.log("URI =", mongoUri);

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("MongoDB Connected:", conn.connection.host);
  } catch (err) { 
    console.log("========== FULL ERROR ==========");
    console.error(err);
    console.log("================================");
    process.exit(1);
  }
};

module.exports = connectDB;