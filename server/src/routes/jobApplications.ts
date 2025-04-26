// server/src/routes/jobApplications.ts
import express, { Router, Request, Response, RequestHandler } from 'express';
import JobApplication from '../models/JobApplication';
import authMiddleware from '../middleware/authMiddleware'; // Import the middleware

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


export default router; // Export the configured router