import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    thumbnail: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    category: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Add pagination support for aggregation pipelines
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
