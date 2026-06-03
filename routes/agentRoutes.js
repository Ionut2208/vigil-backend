const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const agentController = require('../controllers/agentController');
const { agentValidationRules, validate } = require('../middleware/validator');
const Log = require('../models/Log');

const JWT_SECRET = 'HQ_SECURE_CIPHER_KEY_2026';

const authenticateToken = (requiredPermission = null) => async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract from "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: "Access Denied: Token missing from request." });
    }

    try {
        // Verify token authenticity and active expiration date
        const decodedUser = jwt.verify(token, JWT_SECRET);
        req.user = decodedUser; // Inject security context into the request

        // If a specific application permission is demanded, validate against token definitions
        if (requiredPermission && !decodedUser.permissions.includes(requiredPermission)) {
            
            // Log malicious or unauthorized access directly into database
            await Log.create({
                userId: decodedUser.username,
                groupId: decodedUser.role,
                actionInformation: `MALICIOUS ATTEMPT: Unauthorized access validation failed for operational flag [${requiredPermission}].`,
                isSuspicious: true
            });

            return res.status(403).json({ error: "AUTHORIZATION FAILURE: Insufficient Clearance Level." });
        }

        // Standard operational log entry
        await Log.create({
            userId: decodedUser.username,
            groupId: decodedUser.role,
            actionInformation: `Accessed operational action gateway.`,
            isSuspicious: false
        });

        next();
    } catch (err) {
        // Token verification failed (altered token or session expired due to inactivity)
        return res.status(403).json({ error: "Session expired or authentication token invalid." });
    }
};

// Apply access restrictions using our token security layers
router.get('/', authenticateToken('VIEW_AGENTS'), agentController.getAllAgents);
router.post('/', authenticateToken('EDIT_AGENTS'), agentValidationRules, validate, agentController.createAgent);
router.put('/:id', authenticateToken('EDIT_AGENTS'), agentValidationRules, validate, agentController.updateAgent);
router.delete('/:id', authenticateToken('EDIT_AGENTS'), agentController.deleteAgent);

router.get('/stats', authenticateToken('VIEW_AGENTS'), agentController.getStats);

module.exports = router;