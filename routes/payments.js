const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect, admin } = require('../middleware/auth');
const PaymentRequest = require('../models/PaymentRequest');
const Transaction = require('../models/Transaction');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment request
router.post('/request', protect, async (req, res) => {
    try {
        const { amount, description } = req.body;
        
        const paymentRequest = new PaymentRequest({
            user: req.user._id,
            amount,
            description
        });

        await paymentRequest.save();
        res.status(201).json(paymentRequest);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get all payment requests
router.get('/requests', protect, admin, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        
        const requests = await PaymentRequest.find(query)
            .populate('user', 'username email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// User: Get my payment requests
router.get('/my-requests', protect, async (req, res) => {
    try {
        const requests = await PaymentRequest.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Respond to payment request
router.put('/request/:id/respond', protect, admin, async (req, res) => {
    try {
        const { status, adminResponse } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const request = await PaymentRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = status;
        request.adminResponse = adminResponse || '';

        if (status === 'approved') {
            // Create Razorpay order
            const order = await razorpay.orders.create({
                amount: request.amount * 100, // Razorpay expects amount in paise
                currency: 'INR',
                receipt: request._id.toString()
            });

            request.razorpayOrderId = order.id;
        }

        await request.save();
        res.json(request);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify and process payment
router.post('/verify', protect, async (req, res) => {
    try {
        const { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature,
            paymentRequestId 
        } = req.body;

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        // Get payment details from Razorpay
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        
        // Update payment request status
        const paymentRequest = await PaymentRequest.findById(paymentRequestId);
        if (!paymentRequest) {
            return res.status(404).json({ message: 'Payment request not found' });
        }

        paymentRequest.status = 'paid';
        await paymentRequest.save();

        // Create transaction record
        const transaction = new Transaction({
            user: req.user._id,
            paymentRequest: paymentRequestId,
            amount: payment.amount / 100,
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            razorpaySignature: razorpay_signature,
            status: 'success',
            receipt: {
                paymentId: payment.id,
                amount: payment.amount / 100,
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                createdAt: new Date(payment.created_at * 1000),
                email: payment.email
            }
        });

        await transaction.save();
        res.json({ message: 'Payment successful', transaction });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// User: Get my transactions
router.get('/my-transactions', protect, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get all transactions
router.get('/transactions', protect, admin, async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('user', 'username email')
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
