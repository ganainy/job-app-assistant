import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';

dotenv.config(); 

const app: Express = express();
const port = process.env.PORT || 5001; 

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust in production)
app.use(express.json()); // Parse JSON request bodies

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Job App Assistant Backend is Running!');
});

// TODO: Add other routes (auth, jobs, cv generation, etc.)

// TODO: Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("FATAL ERROR: MONGODB_URI is not defined in .env file.");
  process.exit(1); // Exit if DB connection string is missing
}

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});