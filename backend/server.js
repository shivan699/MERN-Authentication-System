require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initSocket } = require("./src/socket");

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

    // Socket.io needs a raw HTTP server (not the Express app directly)
    // to attach to, since both HTTP and WebSocket traffic share the
    // same port.
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    console.log("✅ Socket.io initialized");

    // Start HTTP + WebSocket server together
    httpServer.listen(PORT, () => {
      console.log("==================================");
      console.log(`🚀 Server running on port ${PORT} (HTTP + WebSocket)`);
      console.log("==================================");
    });
  } catch (error) {
    console.error("❌ Failed to start server");
    console.error(error);
    process.exit(1);
  }
};

startServer();