// server/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User'; // Import User model

// Define the structure of the decoded JWT payload
interface JwtPayload {
  userId: string;
  email: string;
}

// Extend the Express Request interface to include the user property
// This tells TypeScript that our authenticated requests will have req.user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Get token from header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // 2. Check if token exists
  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return; // Add return
  }

  // Check if JWT_SECRET is loaded
  if (!JWT_SECRET) {
    console.error("JWT_SECRET not available in authMiddleware!");
    res.status(500).json({ message: 'Server configuration error.' });
    return; // Add return
  }

  try {
    // 3. Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // 4. Find user based on token payload
    const user = await User.findById(decoded.userId).select('-passwordHash'); // Exclude password hash

    if (!user) {
      // If the user associated with the token doesn't exist anymore
      res.status(401).json({ message: 'Invalid token - user not found.' });
      return; // Add return
    }

    // 5. Attach user to the request object
    req.user = user;

    // 6. Call next middleware or route handler
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      // Specific JWT errors
      res.status(401).json({ message: 'Invalid token.' });
      return; // Add return
    }
    // Other potential errors
    res.status(500).json({ message: 'Server error during authentication.' });
    return; // Add return
  }
};

export default authMiddleware;