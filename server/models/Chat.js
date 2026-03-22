import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  swapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SwapRequest',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for efficient querying
chatMessageSchema.index({ swapId: 1, createdAt: -1 });
chatMessageSchema.index({ receiver: 1, read: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
