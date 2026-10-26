import mongoose from "mongoose";
import { Video } from "../models/Video.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinaryUpload.js";
import { videoQueue } from "../jobs/videoQueue.js";

// POST /api/v1/videos/upload
export const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description, tags, category } = req.body;

  if (!title?.trim()) throw new ApiError(400, "Title is required");

  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) throw new ApiError(400, "Video file is required");
  if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is required");

  // Upload both to Cloudinary
  const [videoFile, thumbnail] = await Promise.all([
    uploadOnCloudinary(videoLocalPath, "video"),
    uploadOnCloudinary(thumbnailLocalPath, "image"),
  ]);

  if (!videoFile) throw new ApiError(500, "Error uploading video");
  if (!thumbnail) throw new ApiError(500, "Error uploading thumbnail");

  const video = await Video.create({
    videoFile: { url: videoFile.secure_url, public_id: videoFile.public_id },
    thumbnail: { url: thumbnail.secure_url, public_id: thumbnail.public_id },
    title,
    description: description || "",
    duration: videoFile.duration || 0,
    owner: req.user._id,
    tags: tags ? tags.split(",").map((t) => t.trim().toLowerCase()) : [],
    category: category || "",
  });

  // Push a background job for any additional processing
  await videoQueue.add("process-video", {
    videoId: video._id.toString(),
    cloudinaryUrl: videoFile.secure_url,
    publicId: videoFile.public_id,
  });

  return res.status(201).json(new ApiResponse(201, video, "Video uploaded successfully"));
});

// GET /api/v1/videos
export const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
    category,
  } = req.query;

  const pipeline = [];

  // Match only published videos
  pipeline.push({ $match: { isPublished: true } });

  // Filter by search query (title or tags)
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { tags: { $in: [query.toLowerCase()] } },
        ],
      },
    });
  }

  // Filter by category
  if (category) {
    pipeline.push({ $match: { category: { $regex: category, $options: "i" } } });
  }

  // Filter by uploader
  if (userId) {
    pipeline.push({ $match: { owner: new mongoose.Types.ObjectId(userId) } });
  }

  // Lookup owner details
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }],
    },
  });

  pipeline.push({ $addFields: { owner: { $first: "$owner" } } });

  // Sort
  pipeline.push({ $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } });

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const videos = await Video.aggregatePaginate(Video.aggregate(pipeline), options);

  return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

// GET /api/v1/videos/:videoId
export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const video = await Video.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(videoId), isPublished: true } },
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
  ]);

  if (!video.length) throw new ApiError(404, "Video not found");

  // Increment view count
  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

  // Add to watch history if user is logged in
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { watchHistory: videoId },
    });
  }

  return res.status(200).json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

// PATCH /api/v1/videos/:videoId
export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, tags, category } = req.body;

  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const updateFields = {};
  if (title) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (category) updateFields.category = category;
  if (tags) updateFields.tags = tags.split(",").map((t) => t.trim().toLowerCase());

  // Handle thumbnail update
  if (req.file?.path) {
    await deleteFromCloudinary(video.thumbnail.public_id, "image");
    const thumbnail = await uploadOnCloudinary(req.file.path, "image");
    if (!thumbnail) throw new ApiError(500, "Error uploading thumbnail");
    updateFields.thumbnail = { url: thumbnail.secure_url, public_id: thumbnail.public_id };
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

// DELETE /api/v1/videos/:videoId
export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  // Delete from Cloudinary
  await Promise.all([
    deleteFromCloudinary(video.videoFile.public_id, "video"),
    deleteFromCloudinary(video.thumbnail.public_id, "image"),
  ]);

  await Video.findByIdAndDelete(videoId);

  return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// PATCH /api/v1/videos/toggle/:videoId
export const togglePublish = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this video");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res.status(200).json(
    new ApiResponse(200, { isPublished: video.isPublished }, `Video ${video.isPublished ? "published" : "unpublished"} successfully`)
  );
});
