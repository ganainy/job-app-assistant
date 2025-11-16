// Chat service for AI-powered job description Q&A
import { geminiModel } from '../utils/geminiClient';
import JobApplication, { IJobApplication } from '../models/JobApplication';
import { Types } from 'mongoose';
import { NotFoundError, ValidationError } from '../utils/errors/AppError';

/**
 * Get AI chat response for a job application question and save to history
 * @param jobId - The job application ID
 * @param userId - The user ID (for authorization)
 * @param userQuestion - The user's question about the job
 * @returns The AI's response as a string
 */
export async function getAiChatResponse(
    jobId: string,
    userId: string,
    userQuestion: string
): Promise<string> {
    // Find the job application and ensure the user owns it
    const jobApplication: IJobApplication | null = await JobApplication.findOne({
        _id: new Types.ObjectId(jobId),
        userId: new Types.ObjectId(userId)
    });

    if (!jobApplication) {
        throw new NotFoundError('Job application not found');
    }

    // Check if job description exists
    if (!jobApplication.jobDescriptionText) {
        throw new ValidationError('Job application does not have a job description. Please scrape the job description first.');
    }

    // Get existing chat history for context
    const chatHistory = jobApplication.chatHistory || [];
    
    // Build context from recent chat history (last 10 messages for context)
    const recentHistory = chatHistory.slice(-10);
    let historyContext = '';
    if (recentHistory.length > 0) {
        historyContext = '\n\n**Previous Conversation:**\n';
        recentHistory.forEach(msg => {
            historyContext += `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
        });
    }

    // Construct the prompt for Gemini
    const prompt = `You are a helpful assistant that answers questions about job postings. Your task is to answer the user's question based ONLY on the provided job description text. Do not use external knowledge or make assumptions beyond what is stated in the job description.

**Job Description:**
${jobApplication.jobDescriptionText}${historyContext}

**User Question:**
${userQuestion}

Please provide a clear and helpful answer based solely on the job description above. If the job description doesn't contain enough information to answer the question, please say so.`;

    try {
        // Call Gemini API to generate response
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;

        // Check for blocking or lack of content
        if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
            const blockReason = response?.promptFeedback?.blockReason;
            throw new Error(`AI content generation failed or was blocked: ${blockReason || 'No content generated'}`);
        }

        const responseText = response.text();

        // Save both user question and AI response to chat history
        const updatedHistory = [
            ...chatHistory,
            {
                sender: 'user' as const,
                text: userQuestion,
                timestamp: new Date()
            },
            {
                sender: 'ai' as const,
                text: responseText,
                timestamp: new Date()
            }
        ];

        // Update the job application with new chat history
        await JobApplication.findByIdAndUpdate(
            jobId,
            { chatHistory: updatedHistory },
            { new: true }
        );

        return responseText;
    } catch (error: any) {
        console.error('Error calling Gemini for chat response:', error);
        throw new Error(`Failed to get AI response: ${error.message || error}`);
    }
}

/**
 * Get chat history for a job application
 * @param jobId - The job application ID
 * @param userId - The user ID (for authorization)
 * @returns Array of chat messages
 */
export async function getChatHistory(
    jobId: string,
    userId: string
): Promise<Array<{ sender: 'user' | 'ai'; text: string; timestamp: Date }>> {
    const jobApplication: IJobApplication | null = await JobApplication.findOne({
        _id: new Types.ObjectId(jobId),
        userId: new Types.ObjectId(userId)
    });

    if (!jobApplication) {
        throw new NotFoundError('Job application not found');
    }

    return jobApplication.chatHistory || [];
}

