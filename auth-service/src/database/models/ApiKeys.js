import mongoose from 'mongoose';

const ApiKeySchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    key: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    expiresAt: {
        type: Date,
        required: false
    },
    uuid: {
        type: String,
        required: true
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    allowedOrigins: {
        type: [String],
        default: []
    }
});

const ApiKeys = mongoose.model('ApiKeys', ApiKeySchema);

export default ApiKeys;
