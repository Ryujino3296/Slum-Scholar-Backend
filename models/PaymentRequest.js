const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'paid'],
        default: 'pending'
    },
    adminResponse: {
        type: String,
        default: ''
    },
    razorpayOrderId: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
