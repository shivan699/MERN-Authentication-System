require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("========== SERVER START ==========");
    console.log("PORT =", PORT);
    console.log("MONGO_URI =", process.env.MONGO_URI);

    console.log("Before connectDB...");
    await connectDB();
    console.log("After connectDB...");

    console.log("App Type:", typeof app);

    app.listen(PORT, () => {
      console.log("==================================");
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("==================================");
    });

  } catch (error) {
    console.error("❌ Failed to start server");
    console.error(error);
    process.exit(1);
  }
};

startServer();