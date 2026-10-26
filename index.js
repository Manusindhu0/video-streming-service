import "dotenv/config";
import { app } from "./src/app.js";
import connectDB from "./src/config/db.js";
import { redisClient } from "./src/config/redis.js";

const PORT = process.env.PORT || 8000;

(async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    redisClient.on("connect", () => console.log("✅ Redis connected"));
    redisClient.on("error", (err) => console.error("❌ Redis error:", err));

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
})();
