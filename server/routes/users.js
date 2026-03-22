import express from 'express';
import User from '../models/User.js';
import SwapRequest from '../models/SwapRequest.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'location', 'skillsOffered', 'skillsWanted', 'availability', 'isPublic'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, filteredUpdates, { new: true });
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Browse users
router.get('/browse', auth, async (req, res) => {
  try {
    const { skill, location, page = 1, limit = 10 } = req.query;
    const blockedUserIds = req.user.blockedUsers || [];
    const swapHistory = await SwapRequest.find({
      status: { $in: ['accepted', 'completed'] },
      $or: [
        { requester: req.user._id },
        { recipient: req.user._id }
      ]
    }).select('requester recipient');

    const blockEligibleUserIds = new Set(
      swapHistory.map((swap) => {
        const requesterId = swap.requester.toString();
        const recipientId = swap.recipient.toString();
        return requesterId === req.user._id.toString() ? recipientId : requesterId;
      })
    );

    const query = {
      isPublic: true,
      isActive: true,
      _id: { $ne: req.user._id, ...(blockedUserIds.length ? { $nin: blockedUserIds } : {}) },
      blockedUsers: { $ne: req.user._id }
    };

    if (skill) {
      query.$or = [
        { 'skillsOffered.name': { $regex: skill, $options: 'i' } },
        { 'skillsWanted.name': { $regex: skill, $options: 'i' } }
      ];
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    const users = await User.find(query)
      .select('-email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ lastActive: -1 });

    const usersWithBlockState = users.map((currentUser) => {
      const userData = currentUser.toObject();
      const currentUserId = currentUser._id.toString();
      userData.isBlockedByMe = blockedUserIds.some(
        (blockedUserId) => blockedUserId.toString() === currentUserId
      );
      userData.canBlock = blockEligibleUserIds.has(currentUserId);
      return userData;
    });

    const total = await User.countDocuments(query);

    res.json({
      users: usersWithBlockState,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users blocked by current user
router.get('/blocked', auth, async (req, res) => {
  try {
    const blockedUserIds = req.user.blockedUsers || [];

    if (!blockedUserIds.length) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      _id: { $in: blockedUserIds },
      isActive: true
    })
      .select('-email')
      .sort({ lastActive: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block a user
router.post('/:id/block', auth, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasAcceptedSwapHistory = await SwapRequest.exists({
      status: { $in: ['accepted', 'completed'] },
      $or: [
        { requester: req.user._id, recipient: targetUser._id },
        { requester: targetUser._id, recipient: req.user._id }
      ]
    });

    if (!hasAcceptedSwapHistory) {
      return res.status(403).json({ error: 'You can block users only after a swap request is accepted' });
    }

    const isAlreadyBlocked = req.user.blockedUsers?.some(
      (blockedUserId) => blockedUserId.toString() === req.params.id
    );

    if (isAlreadyBlocked) {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetUser._id }
    });

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Unblock a user
router.delete('/:id/block', auth, async (req, res) => {
  try {
    const hasAcceptedSwapHistory = await SwapRequest.exists({
      status: { $in: ['accepted', 'completed'] },
      $or: [
        { requester: req.user._id, recipient: req.params.id },
        { requester: req.params.id, recipient: req.user._id }
      ]
    });

    if (!hasAcceptedSwapHistory) {
      return res.status(403).json({ error: 'You can unblock only users with accepted swap history' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.id }
    });

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-email');

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasBlockedRequester = user.blockedUsers?.some(
      (blockedUserId) => blockedUserId.toString() === req.user._id.toString()
    );

    const requesterHasBlockedUser = req.user.blockedUsers?.some(
      (blockedUserId) => blockedUserId.toString() === req.params.id
    );

    if (hasBlockedRequester || requesterHasBlockedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isPublic && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Profile is private' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;