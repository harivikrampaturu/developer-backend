import mongoose from 'mongoose';

const AudioSchema = new mongoose.Schema(
    {
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        filename: {
            type: String
        },
        originalName: {
            type: String,
            required: true
        },
        path: {
            type: String
        },
        fileType: {
            type: String,
            default: 'audio file'
        },
        status: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Audio = mongoose.model('Audio', AudioSchema);

export default Audio;
