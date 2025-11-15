import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import { closeBrowser } from './utils/pdfGenerator'; // Assuming this is still needed

dotenv.config();

// Import routes
import jobApplicationRoutes from './routes/jobApplications';
import authRoutes from './routes/auth';
import cvRoutes from './routes/cv';
import generatorRoutes from './routes/generator';
import analysisRoutes from './routes/analysis'; // Import is correct
import coverLetterRoutes from './routes/coverLetter';
// Correct the import for the default export
import protect from './middleware/authMiddleware'; // Import default export and alias it as 'protect'
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// --- Mount Routes ---
// Public route (example)
app.get('/', (req: Request, res: Response) => {
  res.send('Job App Assistant Backend is Running!');
});

// API Routes
app.use('/api/auth', authRoutes); // Auth routes (likely public or specific middleware)
app.use('/api/cv', protect, cvRoutes);  // Protect CV routes
app.use('/api/job-applications', protect, jobApplicationRoutes); // Protect Job Application routes
app.use('/api/generator', protect, generatorRoutes); // Protect Generator routes
app.use('/api/analysis', analysisRoutes); // Mounting looks correct
app.use('/api/cover-letter', protect, coverLetterRoutes); // Protect Cover Letter routes

// Error handling middleware (must be last)
app.use(errorHandler);

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
    const server = app.listen(port, () => {
      console.log(`[server]: Server is running at http://localhost:${port}`);
    });

    // --- Graceful Shutdown ---
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} signal received. Shutting down gracefully...`);
      // Close any resources like Puppeteer if pdfGenerator is used
      // await closeBrowser(); // Uncomment if pdfGenerator is actively used
      server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false).then(() => { // Close DB connection
          console.log('MongoDB connection closed.');
          process.exit(0); // Exit process
        }).catch(err => {
          console.error("Error closing MongoDB connection:", err);
          process.exit(1);
        });
      });
      // Force shutdown if graceful fails after timeout
      setTimeout(() => {
        console.error('Could not close connections in time, forcing shutdown.');
        process.exit(1);
      }, 10000); // 10 seconds timeout
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT')); // Catches Ctrl+C

  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1); // Exit if DB connection fails on startup
  });
