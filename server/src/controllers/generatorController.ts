import { Request, Response } from 'express';
import { ValidatedRequest } from '../middleware/validateRequest';
import { ValidationError, InternalServerError } from '../utils/errors/AppError';
import { improveSectionWithAi } from '../services/generatorService';

export const improveCvSection = async (req: ValidatedRequest, res: Response) => {
    const { sectionName, sectionData } = req.validated!.body!;

    if (!sectionName || !sectionData) {
        throw new ValidationError('Section name and section data are required');
    }

    try {
        const improvedData = await improveSectionWithAi(sectionName, sectionData);
        res.json(improvedData);
    } catch (error: any) {
        console.error('Error in improveCvSection:', error);
        throw new InternalServerError(error.message || 'Failed to improve CV section');
    }
};

