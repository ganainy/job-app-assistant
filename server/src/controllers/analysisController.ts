import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import CvAnalysis from '../models/CvAnalysis';
import { performAnalysis, performJsonAnalysis } from '../services/analysisService';
import mongoose, { Types } from 'mongoose';
import { JsonResumeSchema } from '../types/jsonresume';

// Ensure temp_uploads directory exists
const uploadDir = path.join(__dirname, '../../temp_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|docx/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes));
    }
}).single('cvFile');

export const analyzeCv = (req: Request, res: Response) => {
    // Check if we're getting JSON data instead of a file
    if (req.headers['content-type']?.includes('application/json')) {
        handleJsonAnalysis(req, res);
        return;
    }

    // Handle file upload
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            res.status(400).json({ message: 'File upload error: ' + err.message });
            return;
        } else if (err) {
            console.error('Unknown upload error:', err);
            res.status(400).json({ message: err.message || 'File upload failed.' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'No CV file uploaded.' });
            return;
        }
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const userId = req.user.id;
        const filePath = req.file.path;
        const originalFilename = req.file.originalname;

        try {
            const newAnalysis = new CvAnalysis({
                userId: userId,
                status: 'pending',
                cvFileRef: originalFilename,
            });
            await newAnalysis.save();

            const analysisId = newAnalysis._id as Types.ObjectId;
            res.status(202).json({ analysisId: analysisId, message: 'Analysis started.' });

            setImmediate(() => {
                performAnalysis(filePath, userId, analysisId).catch(error => {
                    console.error(`Error during async analysis for ${analysisId}:`, error);
                    CvAnalysis.findByIdAndUpdate(analysisId, {
                        status: 'failed',
                        errorInfo: error.message || 'Unknown analysis error'
                    }).exec();
                });
            });
        } catch (error: any) {
            console.error('Error starting analysis:', error);
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error(`Error deleting uploaded file ${filePath} after failure:`, unlinkErr);
            });
            res.status(500).json({ message: 'Server error starting analysis.' });
        }
    });
};

const handleJsonAnalysis = async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authorized' });
        return;
    }

    const userId = req.user.id;
    const cvJson = req.body.cvJson as JsonResumeSchema;

    if (!cvJson || typeof cvJson !== 'object') {
        res.status(400).json({ message: 'Invalid or missing CV JSON data.' });
        return;
    }

    try {
        const newAnalysis = new CvAnalysis({
            userId: userId,
            status: 'pending',
        });
        await newAnalysis.save();

        const analysisId = newAnalysis._id as Types.ObjectId;
        res.status(202).json({ analysisId: analysisId, message: 'Analysis started.' });

        setImmediate(() => {
            performJsonAnalysis(cvJson, userId, analysisId).catch(error => {
                console.error(`Error during async JSON analysis for ${analysisId}:`, error);
                CvAnalysis.findByIdAndUpdate(analysisId, {
                    status: 'failed',
                    errorInfo: error.message || 'Unknown analysis error'
                }).exec();
            });
        });
    } catch (error: any) {
        console.error('Error starting JSON analysis:', error);
        res.status(500).json({ message: 'Server error starting analysis.' });
    }
};

export const getAnalysisResults = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        res.status(401).json({ message: 'Not authorized' });
        return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid analysis ID format' });
        return;
    }

    try {
        const analysis = await CvAnalysis.findById(id);

        if (!analysis) {
            res.status(404).json({ message: 'Analysis not found' });
            return;
        }

        if (analysis.userId.toString() !== userId.toString()) {
            console.warn(`Unauthorized attempt to access analysis ${id} by user ${userId}`);
            res.status(403).json({ message: 'Forbidden: You do not own this analysis' });
            return;
        }

        res.status(200).json(analysis);

    } catch (error: any) {
        console.error(`Error retrieving analysis ${id} for user ${userId}:`, error);
        res.status(500).json({ message: 'Server error retrieving analysis results.' });
    }
};

export const deleteAnalysis = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        res.status(401).json({ message: 'Not authorized' });
        return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid analysis ID format' });
        return;
    }

    try {
        const analysisToDelete = await CvAnalysis.findOne({ _id: id, userId: userId });

        if (!analysisToDelete) {
            console.warn(`Attempt to delete non-existent or unauthorized analysis ${id} by user ${userId}`);
            res.status(404).json({ message: 'Analysis not found or not owned by user' });
            return;
        }

        await CvAnalysis.findByIdAndDelete(id);
        console.log(`Analysis ${id} deleted successfully by user ${userId}`);
        res.status(200).json({ message: 'Analysis deleted successfully' });

    } catch (error: any) {
        console.error(`Error deleting analysis ${id} for user ${userId}:`, error);
        res.status(500).json({ message: 'Server error deleting analysis.' });
    }
};
