// Helper function to update workflow progress
import WorkflowRun, { IWorkflowRun } from '../models/WorkflowRun';
import { WorkflowStats } from './autoJobWorkflow';

async function updateWorkflowProgress(
    runId: string,
    updates: {
        status?: 'running' | 'completed' | 'failed';
        currentStep?: string;
        currentStepIndex?: number;
        percentage?: number;
        stepUpdate?: {
            name: string;
            status: 'running' | 'completed' | 'failed';
            message?: string;
            count?: number;
            total?: number;
        };
        stats?: Partial<WorkflowStats>;
        errorMessage?: string;
    }
): Promise<void> {
    try {
        const updateData: any = {};

        if (updates.status) {
            updateData.status = updates.status;
            if (updates.status === 'completed' || updates.status === 'failed') {
                updateData.completedAt = new Date();
            }
        }

        if (updates.currentStep) {
            updateData['progress.currentStep'] = updates.currentStep;
        }

        if (updates.currentStepIndex !== undefined) {
            updateData['progress.currentStepIndex'] = updates.currentStepIndex;
        }

        if (updates.percentage !== undefined) {
            updateData['progress.percentage'] = updates.percentage;
        }

        if (updates.stats) {
            for (const [key, value] of Object.entries(updates.stats)) {
                updateData[`stats.${key}`] = value;
            }
        }

        if (updates.errorMessage) {
            updateData.errorMessage = updates.errorMessage;
        }

        await WorkflowRun.findByIdAndUpdate(runId, updateData);

        // Update specific step if provided
        if (updates.stepUpdate) {
            const run = await WorkflowRun.findById(runId);
            if (run) {
                const stepIndex = run.steps.findIndex((s: IWorkflowRun['steps'][0]) => s.name === updates.stepUpdate!.name);
                if (stepIndex !== -1) {
                    run.steps[stepIndex].status = updates.stepUpdate.status;
                    if (updates.stepUpdate.status === 'running') {
                        run.steps[stepIndex].startedAt = new Date();
                    } else if (updates.stepUpdate.status === 'completed' || updates.stepUpdate.status === 'failed') {
                        run.steps[stepIndex].completedAt = new Date();
                    }
                    if (updates.stepUpdate.message) {
                        run.steps[stepIndex].message = updates.stepUpdate.message;
                    }
                    if (updates.stepUpdate.count !== undefined) {
                        run.steps[stepIndex].count = updates.stepUpdate.count;
                    }
                    if (updates.stepUpdate.total !== undefined) {
                        run.steps[stepIndex].total = updates.stepUpdate.total;
                    }
                    await run.save();
                }
            }
        }
    } catch (error) {
        console.error('Error updating workflow progress:', error);
    }
}

// Export this helper for use in the workflow
export { updateWorkflowProgress };
