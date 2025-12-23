import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { logSecurityEvent } from '../utils/logger';

// Validation error handler
export const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }

    // Log validation errors as potential security probe
    logSecurityEvent('input_validation_failed', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        errors: errors.array().map(e => e.msg)
    });

    return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
    });
};

// Common validation chains
export const authValidators = {
    login: [
        body('email')
            .isEmail().withMessage('Invalid email format')
            .normalizeEmail(),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 1 }).withMessage('Password cannot be empty')
    ],
    signup: [
        body('email')
            .isEmail().withMessage('Invalid email format')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
            .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/[0-9]/).withMessage('Password must contain at least one number'), // Removed special char requirement to be less annoying for internal tool
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
            .escape() // Sanitize
    ]
};

export const accountValidators = {
    update: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
            .escape()
    ]
};
