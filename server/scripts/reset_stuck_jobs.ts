
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import JobApplication from '../server/src/models/JobApplication';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const resetStuckJobs = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        // Find jobs where recommendation exists but score is null AND no error is recorded
        // OR where the recommendation field is somehow corrupt
        const filter = {
            $or: [
                { 'recommendation.score': null, 'recommendation.error': { $exists: false } },
                { 'recommendation.score': null, 'recommendation.error': null },
                { 'recommendation.reason': 'Calculating...' }
            ]
        };

        const result = await JobApplication.updateMany(
            filter,
            {
                $unset: { recommendation: 1 }
            }
        );

        console.log(`Reset ${result.modifiedCount} stuck job recommendations.`);

        if (result.modifiedCount > 0) {
            console.log('These jobs will be automatically picked up for analysis on next page load.');
        } else {
            console.log('No stuck jobs found matching criteria.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

resetStuckJobs();
