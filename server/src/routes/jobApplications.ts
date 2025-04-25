import express, { Router, Request, Response, RequestHandler } from 'express';
import JobApplication, { IJobApplication } from '../models/JobApplication';

const router: Router = express.Router();

// --- Define Routes ---

// GET /api/jobs - Retrieve all job applications (will need user filtering later)
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Add filtering by userId when auth is implemented
    const jobs = await JobApplication.find().sort({ createdAt: -1 }); // Get newest first
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: 'Error fetching job applications', error });
  }
});

// POST /api/jobs - Create a new job application
const createJobHandler: RequestHandler = async (req, res) => {
    const { jobTitle, companyName, status, jobUrl, notes } = req.body;
  
    if (!jobTitle || !companyName) {
      res.status(400).json({ message: 'Job Title and Company Name are required.' });
      return;
    }
  
    try {
      const newJob = new JobApplication({
        jobTitle,
        companyName,
        status: status || 'Not Applied',
        jobUrl,
        notes,
        // TODO: Add userId later
      });
  
      const savedJob = await newJob.save();
      res.status(201).json(savedJob);
    } catch (error) {
      console.error("Error creating job:", error);
      if (error instanceof Error && error.name === 'ValidationError') {
        res.status(400).json({ message: 'Validation failed', errors: error });
        return;
      }
      // Don't return here if you want the final res.status(500) to execute in case of other errors
      res.status(500).json({ message: 'Error creating job application', error });
    }
};
  router.post('/', createJobHandler); 

// GET /api/jobs/:id - Retrieve a single job application by ID
const getJobByIdHandler: RequestHandler = async (req, res) => {
    try {
        const job = await JobApplication.findById(req.params.id);
        // TODO: Add check if job belongs to the logged-in user
        if (!job) {
            res.status(404).json({ message: 'Job application not found' });
            return;
        }
        res.status(200).json(job);
    } catch (error) {
        console.error("Error fetching job by id:", error);
        // Handle invalid ObjectId format
        if (error instanceof Error && error.name === 'CastError') {
            res.status(400).json({ message: 'Invalid job ID format' });
            return;
        }
        res.status(500).json({ message: 'Error fetching job application', error });
    }
};
router.get('/:id', getJobByIdHandler);

// PUT /api/jobs/:id - Update a job application by ID
const updateJobHandler: RequestHandler = async (req, res) =>{
    try {
        // TODO: Add check if job belongs to the logged-in user
        const updatedJob = await JobApplication.findByIdAndUpdate(
            req.params.id,
            req.body, // Pass the request body directly (Mongoose handles updates)
            { new: true, runValidators: true } // Return the updated doc, run schema validators
        );

        if (!updatedJob) {
             res.status(404).json({ message: 'Job application not found' });
             return;
        }
        res.status(200).json(updatedJob);
    } catch (error) {
        console.error("Error updating job:", error);
         if (error instanceof Error && error.name === 'ValidationError') {
             res.status(400).json({ message: 'Validation failed', errors: error });
             return;
        }
         if (error instanceof Error && error.name === 'CastError') {
              res.status(400).json({ message: 'Invalid job ID format' });
              return;
        }
        res.status(500).json({ message: 'Error updating job application', error });
    }
};
router.put('/:id', updateJobHandler);

    // DELETE /api/jobs/:id - Delete a job application by ID
    const deleteJobHandler: RequestHandler = async (req, res) => {
    try {
        // TODO: Add check if job belongs to the logged-in user
        const deletedJob = await JobApplication.findByIdAndDelete(req.params.id);

        if (!deletedJob) {
            res.status(404).json({ message: 'Job application not found' });
            return;
        }
        // Send back a confirmation message or the deleted object id
        res.status(200).json({ message: 'Job application deleted successfully', id: deletedJob._id });
        // Alternatively send status 204 No Content: res.status(204).send();
    } catch (error) {
        console.error("Error deleting job:", error);
        if (error instanceof Error && error.name === 'CastError') {
              res.status(400).json({ message: 'Invalid job ID format' });
             return;
        }
        res.status(500).json({ message: 'Error deleting job application', error });
    }
};
router.delete('/:id', deleteJobHandler);


export default router; // Export the configured router