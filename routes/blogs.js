const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect, admin } = require('../middleware/auth');

// Get all blogs
router.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find().populate('author', 'username');
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a blog
router.post('/', protect, async (req, res) => {
    try {
        const { title, content } = req.body;
        const blog = new Blog({
            title,
            content,
            author: req.user._id
        });

        await blog.save();
        res.status(201).json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a blog
router.put('/:id', protect, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Check if user owns the blog
        if (blog.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { title, content } = req.body;
        blog.title = title;
        blog.content = content;

        await blog.save();
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a blog
router.delete('/:id', protect, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Check if user is admin or owns the blog
        if (!req.user.isAdmin && blog.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await blog.remove();
        res.json({ message: 'Blog removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's blogs
router.get('/my-blogs', protect, async (req, res) => {
    try {
        const blogs = await Blog.find({ author: req.user._id }).populate('author', 'username');
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
