const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paymentRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentRequest',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    razorpayPaymentId: {
        type: String,
        required: true,
        unique: true
    },
    razorpayOrderId: {
        type: String,
        required: true
    },
    razorpaySignature: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        required: true
    },
    receipt: {
        paymentId: String,
        amount: Number,
        currency: String,
        status: String,
        method: String,
        createdAt: Date,
        email: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
