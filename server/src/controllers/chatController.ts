// Chat controller for handling AI chat requests
import { Response } from 'express';
import { getAiChatResponse, getChatHistory } from '../services/chatService';
import { ValidatedRequest } from '../middleware/validateRequest';
import { AuthorizationError } from '../utils/errors/AppError';

/**
 * Handle POST request to chat with AI about a job posting
 * POST /api/chat/:jobId
 */
export const postChatMessage = async (req: ValidatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AuthorizationError('User not authenticated');
    }

    const { jobId } = req.validated!.params!;
    const { question } = req.validated!.body!;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
        throw new Error('Question is required and must be a non-empty string');
    }

    // Call the chat service
    const answer = await getAiChatResponse(jobId, userId, question.trim());

    res.json({
        answer
    });
};

/**
 * Handle GET request to retrieve chat history for a job posting
 * GET /api/chat/:jobId/history
 */
export const getChatHistoryHandler = async (req: ValidatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AuthorizationError('User not authenticated');
    }

    const { jobId } = req.validated!.params!;

    // Get chat history
    const history = await getChatHistory(jobId, userId);

    res.json({
        history
    });
};

