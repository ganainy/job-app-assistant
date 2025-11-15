// server/src/routes/auth.ts
import express, { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User'; // Import User model
import { validateRequest } from '../middleware/validateRequest';
import { registerBodySchema, loginBodySchema } from '../validations/authSchemas';
import { ValidatedRequest } from '../middleware/validateRequest';

const router: Router = express.Router();

// --- Environment Variable for JWT Secret ---
// IMPORTANT: Set this in your server/.env file!
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
    process.exit(1);
}
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d'; // Default to 1 day expiry

// --- Registration Route ---
// POST /api/auth/register
router.post('/register', validateRequest({ body: registerBodySchema }), async (req: ValidatedRequest, res: Response) => {
    const { email, password } = req.validated!.body!;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
             res.status(400).json({ message: 'User with this email already exists.' });
             return;
        }

        // Create new user instance - Assign plain password to passwordHash temporarily
        // The pre-save hook in the model will hash it before saving
        const newUser = new User({
            email,
            passwordHash: password, // Assign plain password here, hook will hash it
        });

        // Save the user (triggers pre-save hook)
        await newUser.save();

        // Don't usually log user in immediately after register, make them log in separately
        res.status(201).json({ message: 'User registered successfully. Please log in.' });

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
        const payload = {
            userId: user._id,
            email: user.email,
            // Add other relevant non-sensitive info if needed (e.g., roles)
        };

        const token = jwt.sign(
            payload,
            JWT_SECRET , 
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


export default router;