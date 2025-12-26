import { v2 as cloudinary } from 'cloudinary';
import { InternalServerError } from '../utils/errors/AppError';

// Initialize Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('[Cloudinary] Configured successfully');
} else {
    console.warn('[Cloudinary] Missing configuration. Image uploads will fail.');
}

export const uploadImageToCloudinary = async (imageUrl: string, folder: string = 'profile-images'): Promise<string> => {
    try {
        const result = await cloudinary.uploader.upload(imageUrl, {
            folder: folder,
            resource_type: 'image',
        });
        return result.secure_url;
    } catch (error: any) {
        console.error(`[Cloudinary] Upload failed: ${error.message}`);
        throw new InternalServerError(`Failed to upload image to Cloudinary: ${error.message}`);
    }
};

export default cloudinary;
