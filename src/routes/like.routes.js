import { Router } from "express";
import {
  toggleVideoLike,
  toggleCommentLike,
  getLikedVideos,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/video/:videoId", verifyJWT, toggleVideoLike);
router.post("/comment/:commentId", verifyJWT, toggleCommentLike);
router.get("/videos", verifyJWT, getLikedVideos);

export default router;
