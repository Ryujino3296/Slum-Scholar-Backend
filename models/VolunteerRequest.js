const mongoose = require('mongoose');

const volunteerRequestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    responseMessage: {
        type: String,
        default: ''
    },
    expiresAt: {
        type: Date,
        default: function() {
            // Set default expiry to 2 weeks from now
            const twoWeeksFromNow = new Date();
            twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
            return twoWeeksFromNow;
        }
    }
}, {
    timestamps: true
});

// Create TTL index on expiresAt field
volunteerRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create compound index for efficient querying
volunteerRequestSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('VolunteerRequest', volunteerRequestSchema);
