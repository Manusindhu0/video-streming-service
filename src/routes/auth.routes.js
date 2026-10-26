import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  register
);
router.post("/login", authLimiter, login);
router.post("/logout", verifyJWT, logout);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", verifyJWT, changePassword);
router.get("/me", verifyJWT, getCurrentUser);

export default router;
