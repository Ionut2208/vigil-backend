const { body, validationResult } = require('express-validator');

const agentValidationRules = [
  body('codename')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Codename must be at least 3 characters long'),
  body('sectorName') // Updated to match the controller's expectation
    .trim()
    .notEmpty()
    .withMessage('Sector name is required'),
  body('clearance')
    .isInt({ min: 1, max: 5 })
    .withMessage('Clearance must be an integer between 1 and 5'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  
  return res.status(400).json({ 
    status: 'VALIDATION_FAILED',
    errors: errors.array().map(err => err.msg) 
  });
};

module.exports = { agentValidationRules, validate };