import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { logger, logSecurityEvent } from '../utils/logger';

// Validation error handler
export const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }

    // Log validation errors as potential security probe
    logger.warn(`Validation failed for ${req.path}:`, {
        errors: errors.array(),
        body: req.body // Be careful with sensitive data, but needed for debug
    });

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
// Generic validators for common fields
export const genericValidators = {
    email: body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
    password: body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    name: body('name').trim().notEmpty().withMessage('Name is required').escape(),
    id: body('id').trim().notEmpty().withMessage('ID is required').escape(),
    date: body('date').optional().isISO8601().withMessage('Invalid date format')
};

export const authValidators = {
    login: [
        genericValidators.email,
        body('password').notEmpty().withMessage('Password is required')
    ],
    signup: [
        genericValidators.email,
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
            .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/[0-9]/).withMessage('Password must contain at least one number'),
        genericValidators.name
    ],
    disconnect: [
        body('platform').isIn(['google', 'meta']).withMessage('Invalid platform'),
        body('email').optional().trim()
    ]
};

export const accountValidators = {
    create: [
        genericValidators.id,
        genericValidators.name,
        genericValidators.email,
        genericValidators.password,
        body('type').isIn(['admin', 'agency']).withMessage('Invalid account type')
    ],
    update: [
        body('name').optional().trim().isLength({ min: 2, max: 50 }).escape(),
        body('email').optional().isEmail().normalizeEmail(),
        body('type').optional().isIn(['admin', 'agency']),
        body('status').optional().isIn(['active', 'pending', 'suspended'])
    ]
};

export const alertValidators = {
    config: [
        body('enabled').isBoolean(),
        body('threshold').isNumeric().withMessage('Threshold must be a number'),
        body('email').optional().isEmail()
    ]
};
