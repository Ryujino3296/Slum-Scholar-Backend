const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

// Get user profile
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { username, email, password } = req.body;

        if (username) user.username = username;
        if (email) user.email = email;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }
        
        await user.save();

        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        };

        res.json(userResponse);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get all users
router.get('/', protect, admin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get specific user
router.get('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Update user
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { username, email, isAdmin } = req.body;

        if (username) user.username = username;
        if (email) user.email = email;
        if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin;

        await user.save();
        
        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        };

        res.json(userResponse);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Delete user
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.remove();
        res.json({ message: 'User removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Make user an admin
router.put('/:id/make-admin', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isAdmin = true;
        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Remove admin privileges
router.put('/:id/remove-admin', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent removing admin privileges from the last admin
        const adminCount = await User.countDocuments({ isAdmin: true });
        if (adminCount <= 1 && user.isAdmin) {
            return res.status(400).json({ message: 'Cannot remove the last admin' });
        }

        user.isAdmin = false;
        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
