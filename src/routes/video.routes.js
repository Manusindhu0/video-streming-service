import { Router } from "express";
import {
  uploadVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublish,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/", getAllVideos);
router.post(
  "/upload",
  verifyJWT,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadVideo
);
router.get("/:videoId", getVideoById);
router.patch(
  "/:videoId",
  verifyJWT,
  upload.single("thumbnail"),
  updateVideo
);
router.delete("/:videoId", verifyJWT, deleteVideo);
router.patch("/toggle/:videoId", verifyJWT, togglePublish);

export default router;
