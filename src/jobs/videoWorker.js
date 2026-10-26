import { Worker } from "bullmq";
import { redisClient } from "../config/redis.js";
import { Video } from "../models/Video.js";

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoId, cloudinaryUrl, publicId } = job.data;
    console.log(`🎬 Processing video job: ${job.id} for video: ${videoId}`);

    // In a real implementation, you would:
    // 1. Download the video from Cloudinary
    // 2. Use ffmpeg to transcode to multiple resolutions (360p, 720p, 1080p)
    // 3. Generate HLS segments (.m3u8 + .ts files)
    // 4. Re-upload to Cloudinary or S3
    // 5. Update the Video document with HLS URLs

    // For now, mark as processed
    await Video.findByIdAndUpdate(videoId, {
      $set: { isPublished: true },
    });

    console.log(`✅ Video ${videoId} processing complete`);
    return { success: true, videoId };
  },
  {
    connection: redisClient,
    concurrency: 2, // Process 2 videos simultaneously
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

export { worker };
