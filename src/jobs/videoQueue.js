import { Queue } from "bullmq";
import { redisClient } from "../config/redis.js";

export const videoQueue = new Queue("video-processing", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
