// server/src/routes/jobApplications.ts
import express, { Router, Request, Response, RequestHandler } from 'express';
import JobApplication from '../models/JobApplication';
import authMiddleware from '../middleware/authMiddleware'; // Import the middleware
import { scrapeJobDescription } from '../utils/scraper';
import { extractJobDataFromUrl, ExtractedJobData } from '../utils/aiExtractor';
import mongoose from 'mongoose'; // Import mongoose for ObjectId type
import { JsonResumeSchema } from '../types/jsonresume'; // Import if needed for validation

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


// ---  Get Draft Data Endpoint ---
// GET /api/jobs/:id/draft
const getJobDraftHandler: RequestHandler = async (req, res) => {
  // Use type assertion for req.user, assuming authMiddleware populates it
  const user = req.user as { _id: mongoose.Types.ObjectId | string }; // Adjust based on your actual user type in req
  if (!user) {
    res.status(401).json({ message: 'User not authenticated correctly.' });
    return;
  }
  const { id: jobId } = req.params;
  const userId = user._id;

  try {
    // Find the job, ensure it belongs to the user, and select only the draft fields + status
    const job = await JobApplication.findOne(
      { _id: jobId, userId: userId },
      'draftCvJson draftCoverLetterText generationStatus companyName jobTitle' // Select fields to return (_id is included by default)
    );

    if (!job) {
      res.status(404).json({ message: 'Job application not found or access denied.' });
      return;
    }

    // Return the draft data (or null if fields are empty)
    res.status(200).json({
      jobId: job._id, // Include IDs for context
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      generationStatus: job.generationStatus,
      draftCvJson: job.draftCvJson || null, // Return null if field doesn't exist/is empty
      draftCoverLetterText: job.draftCoverLetterText || null,
    });

  } catch (error: any) {
    console.error(`Error fetching draft data for job ${jobId}:`, error);
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid job ID format.' });
      return;
    }
    res.status(500).json({ message: 'Server error fetching draft data.' });
  }
};
// Define the route AFTER the generic /:id GET route to avoid conflict
// Or ensure it's distinct enough. Putting it here should be fine.
router.get('/:id/draft', getJobDraftHandler);


// ---  Update Draft Data Endpoint ---
// PUT /api/jobs/:id/draft
const updateJobDraftHandler: RequestHandler = async (req, res) => {
  // Use type assertion for req.user, assuming authMiddleware populates it
  const user = req.user as { _id: mongoose.Types.ObjectId | string }; // Adjust based on your actual user type in req
  if (!user) {
    res.status(401).json({ message: 'User not authenticated.' });
    return;
  }

  const { id: jobId } = req.params;
  const userId = user._id;
  // Expecting updated draft data in the body
  const { draftCvJson, draftCoverLetterText } = req.body as { draftCvJson?: JsonResumeSchema | any, draftCoverLetterText?: string }; // Make optional

  // Basic validation: Ensure at least one part of the draft is provided
  if (draftCvJson === undefined && draftCoverLetterText === undefined) { // Check for undefined instead of falsy
    res.status(400).json({ message: 'No draft data provided for update.' });
    return;
  }
  // Add more robust validation for the structure of draftCvJson if desired here

  try {
    // Prepare the update object conditionally
    const updateData: any = {
      generationStatus: 'draft_ready' // Keep status as draft_ready after edit
    };
    if (draftCvJson !== undefined) {
      updateData.draftCvJson = draftCvJson;
    }
    if (draftCoverLetterText !== undefined) {
      updateData.draftCoverLetterText = draftCoverLetterText;
    }

    // Find the job belonging to the user and update only the draft fields
    const updatedJob = await JobApplication.findOneAndUpdate(
      { _id: jobId, userId: userId },
      { $set: updateData }, // Use the prepared update object
      { new: true, runValidators: true } // Return updated doc, run schema checks
    );

    if (!updatedJob) {
      res.status(404).json({ message: 'Job application not found or access denied.' });
      return;
    }

    console.log(`Draft updated successfully for job ${jobId}`);
    res.status(200).json({
      message: 'Draft updated successfully.',
      // Optionally return the updated draft data or just success message
      // draftCvJson: updatedJob.draftCvJson,
      // draftCoverLetterText: updatedJob.draftCoverLetterText
    });

  } catch (error: any) {
    console.error(`Error updating draft for job ${jobId}:`, error);
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid job ID format.' });
      return;
    }
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ message: 'Draft data validation failed.', errors: error.message });
      return;
    }
    res.status(500).json({ message: 'Server error updating draft data.' });
  }
};
// Add the new route
router.put('/:id/draft', updateJobDraftHandler);


export default router; // Export the configured router