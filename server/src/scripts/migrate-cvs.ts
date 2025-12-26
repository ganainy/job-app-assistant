// server/src/scripts/migrate-cvs.ts
/**
 * CV Migration Script
 * 
 * Migrates CV data from the old storage locations to the unified CV model:
 * - Master CVs: User.cvJson -> CV collection with isMasterCv=true
 * - Job CVs: JobApplication.draftCvJson -> CV collection with isMasterCv=false
 * 
 * This script is idempotent - running it multiple times is safe.
 * 
 * Usage: npx ts-node src/scripts/migrate-cvs.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/User';
import JobApplication from '../models/JobApplication';
import CV from '../models/CV';

interface MigrationStats {
    masterCvsMigrated: number;
    masterCvsSkipped: number;
    jobCvsMigrated: number;
    jobCvsSkipped: number;
    errors: string[];
}

async function migrateCvs(): Promise<MigrationStats> {
    const stats: MigrationStats = {
        masterCvsMigrated: 0,
        masterCvsSkipped: 0,
        jobCvsMigrated: 0,
        jobCvsSkipped: 0,
        errors: [],
    };

    console.log('Starting CV migration...\n');

    // ========================================================================
    // Phase 1: Migrate Master CVs from User collection
    // ========================================================================
    console.log('Phase 1: Migrating master CVs...');

    const usersWithCv = await User.find({ cvJson: { $exists: true, $ne: null } });
    console.log(`Found ${usersWithCv.length} users with master CVs`);

    for (const user of usersWithCv) {
        try {
            // Check if master CV already exists in new collection
            const existingMasterCv = await CV.findOne({ userId: user._id, isMasterCv: true });

            if (existingMasterCv) {
                console.log(`  - Skipping user ${user.email}: Master CV already migrated`);
                stats.masterCvsSkipped++;
                continue;
            }

            // Create new master CV
            await CV.create({
                userId: user._id,
                isMasterCv: true,
                cvJson: user.cvJson,
                templateId: user.selectedTemplate || null,
                filename: user.cvFilename || null,
                analysisCache: user.cvAnalysisCache || null,
            });

            console.log(`  ✓ Migrated master CV for user ${user.email}`);
            stats.masterCvsMigrated++;
        } catch (error: any) {
            const errorMsg = `Error migrating master CV for user ${user.email}: ${error.message}`;
            console.error(`  ✗ ${errorMsg}`);
            stats.errors.push(errorMsg);
        }
    }

    console.log(`\nPhase 1 complete: ${stats.masterCvsMigrated} migrated, ${stats.masterCvsSkipped} skipped\n`);

    // ========================================================================
    // Phase 2: Migrate Job CVs from JobApplication collection
    // ========================================================================
    console.log('Phase 2: Migrating job CVs...');

    const jobsWithCv = await JobApplication.find({
        draftCvJson: { $exists: true, $ne: null },
    });
    console.log(`Found ${jobsWithCv.length} job applications with CVs`);

    for (const job of jobsWithCv) {
        try {
            // Check if job CV already exists in new collection
            const existingJobCv = await CV.findOne({ jobApplicationId: job._id });

            if (existingJobCv) {
                console.log(`  - Skipping job ${job._id} (${job.jobTitle}): CV already migrated`);
                stats.jobCvsSkipped++;
                continue;
            }

            // Create new job CV
            await CV.create({
                userId: job.userId,
                isMasterCv: false,
                jobApplicationId: job._id,
                cvJson: job.draftCvJson,
                templateId: null,
            });

            console.log(`  ✓ Migrated CV for job "${job.jobTitle}" at ${job.companyName}`);
            stats.jobCvsMigrated++;
        } catch (error: any) {
            const errorMsg = `Error migrating CV for job ${job._id}: ${error.message}`;
            console.error(`  ✗ ${errorMsg}`);
            stats.errors.push(errorMsg);
        }
    }

    console.log(`\nPhase 2 complete: ${stats.jobCvsMigrated} migrated, ${stats.jobCvsSkipped} skipped\n`);

    return stats;
}

async function main() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.error('FATAL ERROR: MONGODB_URI is not defined in .env file.');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    try {
        const stats = await migrateCvs();

        console.log('========================================');
        console.log('Migration Summary');
        console.log('========================================');
        console.log(`Master CVs migrated: ${stats.masterCvsMigrated}`);
        console.log(`Master CVs skipped:  ${stats.masterCvsSkipped}`);
        console.log(`Job CVs migrated:    ${stats.jobCvsMigrated}`);
        console.log(`Job CVs skipped:     ${stats.jobCvsSkipped}`);
        console.log(`Total errors:        ${stats.errors.length}`);

        if (stats.errors.length > 0) {
            console.log('\nErrors:');
            stats.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
        }

        const totalMigrated = stats.masterCvsMigrated + stats.jobCvsMigrated;
        const totalSkipped = stats.masterCvsSkipped + stats.jobCvsSkipped;

        console.log('\n========================================');
        if (stats.errors.length === 0) {
            console.log('✓ Migration completed successfully!');
        } else {
            console.log('⚠ Migration completed with some errors.');
        }
        console.log(`Total: ${totalMigrated} CVs migrated, ${totalSkipped} skipped`);
        console.log('========================================\n');
    } catch (error: any) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

// Run if executed directly
main().catch(console.error);
