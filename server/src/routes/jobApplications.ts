// server/src/routes/jobApplications.ts
import express, { Router, Request, Response, RequestHandler } from 'express';
import JobApplication from '../models/JobApplication';
import authMiddleware from '../middleware/authMiddleware'; // Import the middleware
import { scrapeJobDescription } from '../utils/scraper';
import { extractJobDataFromUrl, ExtractedJobData } from '../utils/aiExtractor';

const router: Router = express.Router();

// --- Apply authMiddleware to all routes defined AFTER this line ---
// Explicitly cast to RequestHandler to potentially resolve type inference issues
router.use(authMiddleware as RequestHandler);

// --- Routes are now protected ---

// GET /api/jobs - Retrieve job applications FOR THE LOGGED-IN USER
const getJobsHandler: RequestHandler = async (req, res) => {
  try {
    // req.user should be populated by authMiddleware
    if (!req.user) {
      // Should theoretically not be reached if middleware runs correctly, but good safeguard
      res.status(401).json({ message: 'User not authenticated correctly.' });
      return;
    }
    const userId = req.user._id; // Get user ID from the authenticated user
    const jobs = await JobApplication.find({ userId: userId }).sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    // Avoid sending detailed error object to client in production
    res.status(500).json({ message: 'Error fetching job applications' });
  }
};
router.get('/', getJobsHandler);

// POST /api/jobs - Create a new job application FOR THE LOGGED-IN USER
const createJobHandler: RequestHandler = async (req, res) => {
  const { jobTitle, companyName, status, jobUrl, notes, jobDescriptionText } = req.body;

  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated correctly.' });
    return;
  }
  if (!jobTitle || !companyName) {
    res.status(400).json({ message: 'Job Title and Company Name are required.' });
    return;
  }

  try {
    const newJob = new JobApplication({
      userId: req.user._id, // Assign the user ID from the request
      jobTitle,
      companyName,
      status: status || 'Not Applied',
      jobUrl,
      notes,
      jobDescriptionText // Pass scraped text if provided
    });

    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (error) {
    console.error("Error creating job:", error);
    if (error instanceof Error && error.name === 'ValidationError') {
      // Consider sending specific validation errors if needed for frontend
      res.status(400).json({ message: 'Validation failed', errors: error.message }); // Send message
      return;
    }
    res.status(500).json({ message: 'Error creating job application' });
  }
};
router.post('/', createJobHandler);

// GET /api/jobs/:id - Retrieve a single job application (ensure it belongs to user)
const getJobByIdHandler: RequestHandler = async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated correctly.' });
    return;
  }
  try {
    const job = await JobApplication.findOne({ _id: req.params.id, userId: req.user._id }); // Filter by userId
    if (!job) {
      // Respond with 404 even if job exists but belongs to another user for security
      res.status(404).json({ message: 'Job application not found' });
      return;
    }
    res.status(200).json(job);
  } catch (error) {
    console.error("Error fetching job by id:", error);
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid job ID format' });
      return;
    }
    res.status(500).json({ message: 'Error fetching job application' });
  }
};
router.get('/:id', getJobByIdHandler);

// PUT /api/jobs/:id - Update a job application (ensure it belongs to user)
const updateJobHandler: RequestHandler = async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated correctly.' });
    return;
  }
  try {
    // Ensure req.body doesn't contain userId if you don't want it changeable
    // delete req.body.userId; // Optional safeguard

    const updatedJob = await JobApplication.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, // Find by ID and userId
      req.body, // Pass the updates
      { new: true, runValidators: true } // Options: return updated doc, run schema checks
    );
    if (!updatedJob) {
      res.status(404).json({ message: 'Job application not found or not authorized to update' });
      return;
    }
    res.status(200).json(updatedJob);
  } catch (error) {
    console.error("Error updating job:", error);
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation failed', errors: error.message });
      return;
    }
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid job ID format' });
      return;
    }
    res.status(500).json({ message: 'Error updating job application' });
  }
};
router.put('/:id', updateJobHandler);

// DELETE /api/jobs/:id - Delete a job application (ensure it belongs to user)
const deleteJobHandler: RequestHandler = async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated correctly.' });
    return;
  }
  try {
    const deletedJob = await JobApplication.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); // Find by ID and userId
    if (!deletedJob) {
      res.status(404).json({ message: 'Job application not found or not authorized to delete' });
      return;
    }

    res.status(200).json({ message: 'Job application deleted successfully', id: deletedJob._id });

  } catch (error) {
    console.error("Error deleting job:", error);
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid job ID format' });
      return;
    }
    res.status(500).json({ message: 'Error deleting job application' });
  }
};
router.delete('/:id', deleteJobHandler);


// ---  Scrape Job Description Endpoint ---
// PATCH /api/jobs/:id/scrape - Using PATCH as we're partially updating
const scrapeJobHandler: RequestHandler = async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated correctly.' });
    return;
  }
  const { id: jobId } = req.params; // Get jobId from route parameters
  const userId = req.user._id;
  let jobUrlToScrape = req.body.url; // Optionally allow passing URL in body

  try {
    // 1. Find the job application
    const job = await JobApplication.findOne({ _id: jobId, userId: userId });
    if (!job) {
      res.status(404).json({ message: 'Job application not found or access denied.' });
      return;
    }

    // 2. Determine URL to scrape (use stored URL if not provided in body)
    if (!jobUrlToScrape) {
      jobUrlToScrape = job.jobUrl;
    }
    if (!jobUrlToScrape) {
      res.status(400).json({ message: 'No Job URL found for this application to scrape.' });
      return;
    }

    // Optional: Validate if the provided URL matches the stored one if both exist?

    // 3. Call the scraper utility
    console.log(`Attempting to scrape description for job ${jobId} from URL: ${jobUrlToScrape}`);
    const extractedText = await scrapeJobDescription(jobUrlToScrape); // This can throw errors

    // 4. Update the job application in the database
    const updatedJob = await JobApplication.findOneAndUpdate(
      { _id: jobId, userId: userId },
      { $set: { jobDescriptionText: extractedText, jobUrl: jobUrlToScrape } }, // Update description AND URL (if passed in body)
      { new: true, runValidators: true }
    );

    if (!updatedJob) {
      // Should not happen if findOne worked, but good safeguard
      res.status(404).json({ message: 'Job application could not be updated after scraping.' });
      return;
    }

    console.log(`Successfully scraped and updated job description for job ${jobId}`);
    res.status(200).json({
      message: 'Job description scraped and updated successfully.',
      job: updatedJob // Send back the updated job object
    });

  } catch (error: any) {
    console.error(`Scraping failed for job ${jobId}:`, error);
    // Send back specific error message from scraper or generic one
    res.status(500).json({
      message: 'Failed to scrape job description.',
      error: error.message || 'Unknown scraping error.'
    });
  }
};
router.patch('/:id/scrape', scrapeJobHandler);


// ---  Create Job From URL Endpoint ---
// POST /api/jobs/create-from-url
const createJobFromUrlHandler: RequestHandler = async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated.' });
    return;
  }
  const { url } = req.body; // Expect URL in the request body
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
     res.status(400).json({ message: 'Valid URL is required in the request body.' });
     return;
  }

  const userId = req.user._id;

  try {
    console.log(`Attempting to create job from URL for user ${userId}: ${url}`);
    // 1. Call the AI extractor utility
    const extractedData: ExtractedJobData = await extractJobDataFromUrl(url);

    // 2. Create a new JobApplication document
    // Note: We trust the extractor threw an error if essential fields were null
    const newJob = new JobApplication({
      userId: userId,
      jobTitle: extractedData.jobTitle,
      companyName: extractedData.companyName,
      jobDescriptionText: extractedData.jobDescriptionText,
      language: extractedData.language,
      notes: extractedData.notes || '', // Use extracted notes or empty string
      jobUrl: url, // Save the original URL
      status: 'Not Applied', // Default status
    });

    // 3. Save the document
    const savedJob = await newJob.save();
    console.log(`Successfully created job ${savedJob._id} from URL ${url}`);

    // 4. Return the created job
    res.status(201).json(savedJob);

  } catch (error: any) {
    console.error(`Failed to create job from URL ${url}:`, error);
    // Provide more specific feedback based on the error thrown by the extractor
    res.status(500).json({
      message: 'Failed to create job from URL.',
      error: error.message || 'Unknown server error during URL processing.'
    });
  }
};
router.post('/create-from-url', createJobFromUrlHandler); // Add the new route

export default router; // Export the configured router