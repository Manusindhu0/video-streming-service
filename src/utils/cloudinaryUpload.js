import { cloudinary } from "../config/cloudinary.js";
import fs from "fs";

/**
 * Upload a local file to Cloudinary and delete it locally afterwards
 */
const uploadOnCloudinary = async (localFilePath, resourceType = "auto") => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType,
    });

    // File uploaded successfully, remove the local temp file
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // Remove local file even if upload fails
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    throw error;
  }
};

/**
 * Delete an asset from Cloudinary by public_id
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    throw error;
  }
};

const cleanupTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Error removing temp file:", err);
    }
  }
};

export { uploadOnCloudinary, deleteFromCloudinary, cleanupTempFile };
