import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import CvAnalysis from '../models/CvAnalysis'; // Import the model
import { performAnalysis } from '../services/analysisService'; // Import the service function
import mongoose, { Types } from 'mongoose'; // Import mongoose and Types

// Ensure temp_uploads directory exists
const uploadDir = path.join(__dirname, '../../temp_uploads'); // Adjust path as needed
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size (e.g., 10MB)
    fileFilter: (req, file, cb) => {
        // Accept specific file types (e.g., pdf, docx)
        const allowedTypes = /pdf|docx/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes));
    }
}).single('cvFile'); // Expecting a single file with the field name 'cvFile'

export const analyzeCv = (req: Request, res: Response) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            console.error('Multer error:', err);
            res.status(400).json({ message: 'File upload error: ' + err.message });
            return; // Added return
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('Unknown upload error:', err);
            res.status(400).json({ message: err.message || 'File upload failed.' });
            return; // Added return
        }

        // File uploaded successfully
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded.' });
            return; // Added return
        }
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return; // Added return
        }

        // ... rest of analyzeCv ...
        const userId = req.user.id;
        const filePath = req.file.path;
        const originalFilename = req.file.originalname;

        try {
            // 1. Create initial analysis record
            const newAnalysis = new CvAnalysis({
                userId: userId,
                status: 'pending',
                cvFileRef: originalFilename, // Store original filename for reference
                // Other fields will be populated by the analysis service
            });
            await newAnalysis.save();

            // Explicitly cast _id to Types.ObjectId
            const analysisId = newAnalysis._id as Types.ObjectId;

            // 2. Return the ID immediately
            res.status(202).json({ analysisId: analysisId, message: 'Analysis started.' });

            // 3. Trigger analysis asynchronously (fire and forget)
            // We don't await this, so the response is sent quickly
            setImmediate(() => {
                // analysisId is now correctly typed as Types.ObjectId
                performAnalysis(filePath, userId, analysisId).catch(error => {
                    console.error(`Error during async analysis for ${analysisId}:`, error);
                    // Optionally update the analysis record status to 'failed' here
                    // analysisId is also correctly typed for findByIdAndUpdate
                    CvAnalysis.findByIdAndUpdate(analysisId, { status: 'failed', errorInfo: error.message || 'Unknown analysis error' }).exec();
                });
            });

        } catch (error) {
            console.error('Error starting analysis:', error);
            // Attempt to clean up uploaded file
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error(`Error deleting uploaded file ${filePath} after failure:`, unlinkErr);
            });
            res.status(500).json({ message: 'Server error starting analysis.' });
            // No explicit return needed here as it's the end of the async callback
        }
    });
};


// --- Implementation for GET /api/analysis/:id ---
export const getAnalysisResults = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id; // Assuming user ID is attached by authMiddleware

    if (!userId) {
        res.status(401).json({ message: 'Not authorized' });
        return; // Added return
    }

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid analysis ID format' });
        return; // Added return
    }

    try {
        const analysis = await CvAnalysis.findById(id);

        if (!analysis) {
            res.status(404).json({ message: 'Analysis not found' });
            return; // Added return
        }

        // Ensure the analysis belongs to the requesting user
        if (analysis.userId.toString() !== userId.toString()) {
            // Log potential unauthorized access attempt
            console.warn(`Unauthorized attempt to access analysis ${id} by user ${userId}`);
            res.status(403).json({ message: 'Forbidden: You do not own this analysis' });
            return; // Added return
        }

        // Return the analysis document
        res.status(200).json(analysis);
        // No return needed here as it's the successful end of the function

    } catch (error: any) {
        console.error(`Error retrieving analysis ${id} for user ${userId}:`, error);
        res.status(500).json({ message: 'Server error retrieving analysis results.' });
        // No explicit return needed here as it's the end of the function
    }
};


// --- Implementation for DELETE /api/analysis/:id ---
export const deleteAnalysis = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id; // Assuming user ID is attached by authMiddleware

    if (!userId) {
        res.status(401).json({ message: 'Not authorized' });
        return; // Added return
    }

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid analysis ID format' });
        return; // Added return
    }

    try {
        // Find the document first to ensure it belongs to the user before deleting
        const analysisToDelete = await CvAnalysis.findOne({ _id: id, userId: userId });

        if (!analysisToDelete) {
            // Either not found or doesn't belong to the user
            console.warn(`Attempt to delete non-existent or unauthorized analysis ${id} by user ${userId}`);
            res.status(404).json({ message: 'Analysis not found or not owned by user' });
            return; // Added return
        }

        // Delete the document
        await CvAnalysis.findByIdAndDelete(id);

        // Optional: Delete associated file logic...

        console.log(`Analysis ${id} deleted successfully by user ${userId}`);
        res.status(200).json({ message: 'Analysis deleted successfully' }); // Use 200 or 204 No Content
        // No return needed here as it's the successful end of the function

    } catch (error: any) {
        console.error(`Error deleting analysis ${id} for user ${userId}:`, error);
        res.status(500).json({ message: 'Server error deleting analysis.' });
        // No explicit return needed here as it's the end of the function
    }
};
