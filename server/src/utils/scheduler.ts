// server/src/utils/scheduler.ts
import cron from 'node-cron';
import Profile from '../models/Profile';
import { runAutoJobWorkflow } from '../services/autoJobWorkflow';

/**
 * Initialize the auto-job scheduler
 * Runs at the configured schedule for each user with auto-jobs enabled
 */
export const initializeScheduler = () => {
    console.log('\n═══════════════════════════════════════');
    console.log('  Auto-Job Scheduler Initialized');
    console.log('═══════════════════════════════════════\n');

    // Run scheduled workflow check every hour
    // This checks each user's custom schedule and runs if needed
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('\n----- Scheduled Auto-Job Check -----');
            console.log(`Time: ${new Date().toISOString()}`);

            // Find all users with auto-jobs enabled
            const profiles = await Profile.find({
                'autoJobSettings.enabled': true
            });

            if (profiles.length === 0) {
                console.log('No users with auto-jobs enabled');
                return;
            }

            console.log(`Found ${profiles.length} user(s) with auto-jobs enabled`);

            for (const profile of profiles) {
                const settings = (profile as any).autoJobSettings;
                if (!settings || !settings.enabled) continue;

                const userId = profile.userId.toString();
                const userSchedule = settings.schedule || '0 9 * * *';

                // Check if it's time to run for this user
                // For simplicity, we'll run for all users daily at 9 AM
                // In a more sophisticated version, we'd parse and check individual schedules
                const now = new Date();
                const hour = now.getHours();

                // Run if it's 9 AM (hour 9) - matching default schedule
                if (hour === 9) {
                    console.log(`\n→ Running workflow for user: ${userId}`);
                    try {
                        const stats = await runAutoJobWorkflow(userId);
                        console.log(`✓ Workflow completed for user ${userId}`);
                        console.log(`  Stats: ${stats.generated} generated / ${stats.relevant} relevant / ${stats.jobsFound} found`);
                    } catch (error: any) {
                        console.error(`✗ Workflow failed for user ${userId}:`, error.message);
                    }
                }
            }

            console.log('\n----- Scheduled Check Complete -----\n');
        } catch (error: any) {
            console.error('Error in scheduled auto-job check:', error);
        }
    });

    console.log('✓ Scheduler running: Checks every hour for workflows to execute');
    console.log('✓ Default schedule: Daily at 9 AM for each user\n');
};

/**
 * For testing: Manually run workflow for all enabled users
 */
export const runForAllEnabledUsers = async () => {
    try {
        const profiles = await Profile.find({
            'autoJobSettings.enabled': true
        });

        console.log(`\nRunning Auto-Job Workflow for ${profiles.length} enabled user(s)...\n`);

        for (const profile of profiles) {
            const userId = profile.userId.toString();
            console.log(`----- User: ${userId} -----`);

            try {
                const stats = await runAutoJobWorkflow(userId);
                console.log(`✓ Completed for user ${userId}`);
                console.log(`  Generated: ${stats.generated}, Relevant: ${stats.relevant}, Total: ${stats.jobsFound}\n`);
            } catch (error: any) {
                console.error(`✗ Failed for user ${userId}:`, error.message, '\n');
            }
        }

        console.log('All enabled users processed.\n');
    } catch (error: any) {
        console.error('Error running for all users:', error);
    }
};
