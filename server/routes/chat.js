import express from 'express';
import ChatMessage from '../models/Chat.js';
import SwapRequest from '../models/SwapRequest.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get chat messages for a swap
router.get('/:swapId', auth, async (req, res) => {
  try {
    const { swapId } = req.params;

    // Verify user is part of this swap
    const swap = await SwapRequest.findById(swapId);
    if (!swap) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    const isRequester = swap.requester.toString() === req.user._id.toString();
    const isRecipient = swap.recipient.toString() === req.user._id.toString();

    if (!isRequester && !isRecipient) {
      return res.status(403).json({ error: 'Not authorized to view this chat' });
    }

    // Get all messages for this swap
    const messages = await ChatMessage.find({ swapId })
      .populate('sender', 'name profilePhoto')
      .populate('receiver', 'name')
      .sort({ createdAt: 1 });

    // Mark messages as read if user is the receiver
    await ChatMessage.updateMany(
      { swapId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/:swapId/send', auth, async (req, res) => {
  try {
    const { swapId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Verify swap exists and user is part of it
    const swap = await SwapRequest.findById(swapId);
    if (!swap) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    if (swap.status !== 'accepted') {
      return res.status(400).json({ error: 'Can only chat on accepted swaps' });
    }

    const isRequester = swap.requester.toString() === req.user._id.toString();
    const isRecipient = swap.recipient.toString() === req.user._id.toString();

    if (!isRequester && !isRecipient) {
      return res.status(403).json({ error: 'Not authorized to send message' });
    }

    // Determine receiver
    const receiver = isRequester ? swap.recipient : swap.requester;

    // Create message
    const chatMessage = new ChatMessage({
      swapId,
      sender: req.user._id,
      receiver,
      message: message.trim()
    });

    await chatMessage.save();
    await chatMessage.populate('sender', 'name profilePhoto');
    await chatMessage.populate('receiver', 'name');

    res.status(201).json({ message: chatMessage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread message count for user
router.get('/user/unread-count', auth, async (req, res) => {
  try {
    const count = await ChatMessage.countDocuments({
      receiver: req.user._id,
      read: false
    });

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
