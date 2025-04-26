import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';

dotenv.config();

// Import routes
import jobApplicationRoutes from './routes/jobApplications'; 
import authRoutes from './routes/auth'; 


const app: Express = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json()); // Important: must come before routes to parse body

// --- Mount Routes ---
app.use('/api/jobs', jobApplicationRoutes); // <-- Mount the job routes under /api/jobs
app.use('/api/auth', authRoutes); // <-- Mount the auth routes under /api/auth

// Basic root route (optional)
app.get('/', (req: Request, res: Response) => {
  res.send('Job App Assistant Backend is Running!');
});

// --- MongoDB Connection ---
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("FATAL ERROR: MONGODB_URI is not defined in .env file.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
     console.log('MongoDB Connected Successfully');
     // Start listening only after successful DB connection
     app.listen(port, () => {
       console.log(`[server]: Server is running at http://localhost:${port}`);
     });
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1); // Exit if DB connection fails on startup
  });