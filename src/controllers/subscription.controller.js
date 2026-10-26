import mongoose from "mongoose";
import { Subscription } from "../models/Subscription.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/v1/subscriptions/channel/:channelId
export const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel ID");

  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const existingSub = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (existingSub) {
    await Subscription.findByIdAndDelete(existingSub._id);
    return res.status(200).json(new ApiResponse(200, { subscribed: false }, "Unsubscribed"));
  }

  await Subscription.create({ subscriber: req.user._id, channel: channelId });
  return res.status(200).json(new ApiResponse(200, { subscribed: true }, "Subscribed"));
});

// GET /api/v1/subscriptions/channel/:channelId/subscribers
export const getSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel ID");

  const subscribers = await Subscription.aggregate([
    { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }],
      },
    },
    { $addFields: { subscriber: { $first: "$subscriber" } } },
    { $project: { subscriber: 1, createdAt: 1 } },
  ]);

  return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched"));
});

// GET /api/v1/subscriptions/subscriptions
export const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.aggregate([
    { $match: { subscriber: new mongoose.Types.ObjectId(req.user._id) } },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }],
      },
    },
    { $addFields: { channel: { $first: "$channel" } } },
    { $project: { channel: 1, createdAt: 1 } },
  ]);

  return res.status(200).json(new ApiResponse(200, subscriptions, "Subscribed channels fetched"));
});
