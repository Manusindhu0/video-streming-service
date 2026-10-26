import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Subscription } from "../models/Subscription.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinaryUpload.js";

// GET /api/v1/users/profile/:username
export const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const channel = await User.aggregate([
    { $match: { username: username.toLowerCase() } },
    {
      // Count how many documents have this user as the "channel" (their subscribers)
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // Count which channels this user has subscribed to
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!channel?.length) throw new ApiError(404, "Channel not found");

  return res.status(200).json(new ApiResponse(200, channel[0], "User profile fetched"));
});

// PATCH /api/v1/users/update
export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName && !email) throw new ApiError(400, "At least one field is required");

  const updateFields = {};
  if (fullName) updateFields.fullName = fullName;
  if (email) updateFields.email = email;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, user, "Account details updated"));
});

// PATCH /api/v1/users/avatar
export const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

  // Delete old avatar from cloudinary
  if (req.user.avatar?.public_id) {
    await deleteFromCloudinary(req.user.avatar.public_id, "image");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) throw new ApiError(500, "Error uploading avatar");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: { url: avatar.secure_url, public_id: avatar.public_id } } },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, user, "Avatar updated"));
});

// PATCH /api/v1/users/cover-image
export const updateCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;
  if (!coverLocalPath) throw new ApiError(400, "Cover image file is required");

  if (req.user.coverImage?.public_id) {
    await deleteFromCloudinary(req.user.coverImage.public_id, "image");
  }

  const cover = await uploadOnCloudinary(coverLocalPath);
  if (!cover) throw new ApiError(500, "Error uploading cover image");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: { url: cover.secure_url, public_id: cover.public_id } } },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, user, "Cover image updated"));
});

// GET /api/v1/users/watch-history
export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                { $project: { fullName: 1, username: 1, avatar: 1 } },
              ],
            },
          },
          { $addFields: { owner: { $first: "$owner" } } },
        ],
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched"));
});
