const express = require('express');
const router = express.Router();
const VolunteerRequest = require('../models/VolunteerRequest');
const { protect, admin } = require('../middleware/auth');

// Create a volunteer request
router.post('/', protect, async (req, res) => {
    try {
        const { title, description } = req.body;
        const volunteerRequest = new VolunteerRequest({
            title,
            description,
            user: req.user._id
        });

        await volunteerRequest.save();
        res.status(201).json(volunteerRequest);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's volunteer requests
router.get('/my-requests', protect, async (req, res) => {
    try {
        const requests = await VolunteerRequest.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get all volunteer requests
router.get('/all', protect, admin, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        
        const requests = await VolunteerRequest.find(query)
            .populate('user', 'username email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Respond to a volunteer request
router.put('/:id/respond', protect, admin, async (req, res) => {
    try {
        const { status, responseMessage } = req.body;
        
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const request = await VolunteerRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request has already been processed' });
        }

        // Update request status and set expiry
        request.status = status;
        request.responseMessage = responseMessage || '';
        
        // Set expiry to 2 weeks from now
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        request.expiresAt = twoWeeksFromNow;

        await request.save();
        res.json(request);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get specific volunteer request
router.get('/:id', protect, async (req, res) => {
    try {
        const request = await VolunteerRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Check if user is admin or the request owner
        if (!req.user.isAdmin && request.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(request);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
