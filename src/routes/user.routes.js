import { Router } from "express";
import {
  getUserProfile,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/profile/:username", getUserProfile);
router.patch("/update", verifyJWT, updateAccountDetails);
router.patch("/avatar", verifyJWT, upload.single("avatar"), updateAvatar);
router.patch("/cover-image", verifyJWT, upload.single("coverImage"), updateCoverImage);
router.get("/watch-history", verifyJWT, getWatchHistory);

export default router;
