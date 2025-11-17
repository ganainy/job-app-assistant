// server/src/routes/auth.ts
import express, { Router, Request, Response, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User'; // Import User model
import { validateRequest } from '../middleware/validateRequest';
import { registerBodySchema, loginBodySchema } from '../validations/authSchemas';
import { ValidatedRequest } from '../middleware/validateRequest';
import authMiddleware from '../middleware/authMiddleware';

const router: Router = express.Router();

// --- Environment Variable for JWT Secret ---
// IMPORTANT: Set this in your server/.env file!
const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
        process.exit(1);
    }
    return secret;
};

const JWT_SECRET: string = getJwtSecret();
const JWT_EXPIRY: string = process.env.JWT_EXPIRY || '1d'; // Default to 1 day expiry

// --- Registration Route ---
// POST /api/auth/register
router.post('/register', validateRequest({ body: registerBodySchema }), async (req: ValidatedRequest, res: Response) => {
    const { email, password, username } = req.validated!.body!;

    try {
        // Check if user already exists by email
        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
             res.status(400).json({ message: 'User with this email already exists.' });
             return;
        }

        // Check if username is already taken
        const existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
             res.status(400).json({ message: 'Username is already taken. Please choose a different username.' });
             return;
        }

        // Create new user instance - Assign plain password to passwordHash temporarily
        // The pre-save hook in the model will hash it before saving
        const newUser = new User({
            email,
            username,
            passwordHash: password, // Assign plain password here, hook will hash it
        });

        // Save the user (triggers pre-save hook)
        await newUser.save();

        // Don't usually log user in immediately after register, make them log in separately
        res.status(201).json({ 
            message: 'User registered successfully. Please log in.',
            requiresApiKeys: true 
        });

    } catch (error) {
        console.error("Registration Error:", error);
         if (error instanceof Error && error.name === 'ValidationError') {
            // Extract specific validation messages if needed
             res.status(400).json({ message: 'Registration validation failed', errors: error.message });
            return;
        }
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


// --- Login Route ---
// POST /api/auth/login
router.post('/login', validateRequest({ body: loginBodySchema }), async (req: ValidatedRequest, res: Response) => {
    const { email, password } = req.validated!.body!;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
             res.status(401).json({ message: 'Invalid credentials.' }); // Use generic message
             return ;
        }

        // Compare provided password with the stored hash
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
             res.status(401).json({ message: 'Invalid credentials.' }); // Use generic message
             return ;
        }

        // --- Generate JWT ---
        const payload: { userId: string; email: string } = {
            userId: String(user._id),
            email: user.email,
            // Add other relevant non-sensitive info if needed (e.g., roles)
        };

        const token = jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY as any }
        );

        // Send token back to client
        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: { // Send back some user info (excluding password hash!)
                id: user._id,
                email: user.email,
                cvJson: user.cvJson || null
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// --- Get Current User Profile Route ---
// GET /api/auth/me
router.get('/me', authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated.' });
            return;
        }

        // Return user profile data (excluding password hash)
        res.status(200).json({
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            createdAt: req.user.createdAt,
            updatedAt: req.user.updatedAt,
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: 'Server error fetching user profile.' });
    }
});

// --- Update Username Route ---
// PUT /api/auth/username
router.put('/username', authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated.' });
            return;
        }

        const { username } = req.body;

        // Validate username format
        if (!username || typeof username !== 'string') {
            res.status(400).json({ message: 'Username is required.' });
            return;
        }

        const trimmedUsername = username.trim().toLowerCase();

        // Username validation: alphanumeric, hyphens, underscores only (3-30 characters)
        const usernameRegex = /^[a-z0-9_-]{3,30}$/;
        if (!usernameRegex.test(trimmedUsername)) {
            res.status(400).json({ 
                message: 'Username must be 3-30 characters long and contain only letters, numbers, hyphens, or underscores.' 
            });
            return;
        }

        // Check if username is already taken
        const existingUser = await User.findOne({ username: trimmedUsername });
        if (existingUser && String(existingUser._id) !== String(req.user._id)) {
            res.status(400).json({ message: 'Username is already taken.' });
            return;
        }

        // Update username
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { username: trimmedUsername },
            { new: true }
        );

        if (!updatedUser) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        res.status(200).json({
            message: 'Username updated successfully',
            username: updatedUser.username,
        });

    } catch (error) {
        console.error("Update Username Error:", error);
        if (error instanceof Error && error.name === 'MongoServerError' && (error as any).code === 11000) {
            res.status(400).json({ message: 'Username is already taken.' });
            return;
        }
        res.status(500).json({ message: 'Server error updating username.' });
    }
});


export default router;