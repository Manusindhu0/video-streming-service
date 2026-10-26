import mongoose from "mongoose";
import { Like } from "../models/Like.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/v1/likes/video/:videoId
export const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res.status(200).json(new ApiResponse(200, { liked: false }, "Video unliked"));
  }

  await Like.create({ video: videoId, likedBy: req.user._id });
  return res.status(200).json(new ApiResponse(200, { liked: true }, "Video liked"));
});

// POST /api/v1/likes/comment/:commentId
export const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");

  const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res.status(200).json(new ApiResponse(200, { liked: false }, "Comment unliked"));
  }

  await Like.create({ comment: commentId, likedBy: req.user._id });
  return res.status(200).json(new ApiResponse(200, { liked: true }, "Comment liked"));
});

// GET /api/v1/likes/videos
export const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    { $match: { likedBy: new mongoose.Types.ObjectId(req.user._id), video: { $exists: true } } },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          { $match: { isPublished: true } },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }],
            },
          },
          { $addFields: { owner: { $first: "$owner" } } },
        ],
      },
    },
    { $addFields: { video: { $first: "$video" } } },
    { $match: { video: { $ne: null } } },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched"));
});
