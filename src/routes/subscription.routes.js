import { Router } from "express";
import {
  toggleSubscription,
  getSubscribers,
  getSubscribedChannels,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/channel/:channelId", verifyJWT, toggleSubscription);
router.get("/channel/:channelId/subscribers", getSubscribers);
router.get("/subscriptions", verifyJWT, getSubscribedChannels);

export default router;
