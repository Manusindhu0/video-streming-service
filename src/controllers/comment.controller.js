import mongoose from "mongoose";
import { Comment } from "../models/Comment.js";
import { Video } from "../models/Video.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/v1/comments/:videoId
export const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content, parentId } = req.body;

  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");
  if (!content?.trim()) throw new ApiError(400, "Comment content is required");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
    parent: parentId || null,
  });

  return res.status(201).json(new ApiResponse(201, comment, "Comment added"));
});

// GET /api/v1/comments/:videoId
export const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const pipeline = [
    // Only top-level comments (no parent)
    { $match: { video: new mongoose.Types.ObjectId(videoId), parent: null } },
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
    // Count replies for each comment
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "parent",
        as: "replies",
      },
    },
    { $addFields: { repliesCount: { $size: "$replies" } } },
    { $project: { replies: 0 } },
    { $sort: { createdAt: -1 } },
  ];

  const options = { page: parseInt(page), limit: parseInt(limit) };
  const comments = await Comment.aggregatePaginate(Comment.aggregate(pipeline), options);

  return res.status(200).json(new ApiResponse(200, comments, "Comments fetched"));
});

// PATCH /api/v1/comments/:commentId
export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");
  if (!content?.trim()) throw new ApiError(400, "Content is required");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You cannot edit this comment");
  }

  comment.content = content;
  await comment.save();

  return res.status(200).json(new ApiResponse(200, comment, "Comment updated"));
});

// DELETE /api/v1/comments/:commentId
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You cannot delete this comment");
  }

  // Delete comment and all its replies
  await Comment.deleteMany({ $or: [{ _id: commentId }, { parent: commentId }] });

  return res.status(200).json(new ApiResponse(200, {}, "Comment deleted"));
});
