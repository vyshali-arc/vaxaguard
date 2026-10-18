const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get all notifications for logged in user
// @route   GET /api/notifications
// @access  Private
async function getNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      readAt: null
    });

    res.json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
async function updatePreferences(req, res, next) {
  try {
    const { emailNotifications, smsNotifications, reminderTimingDays, notes } = req.body;

    const user = await User.findById(req.user._id);

    if (emailNotifications !== undefined) user.preferences.emailNotifications = !!emailNotifications;
    if (smsNotifications !== undefined) user.preferences.smsNotifications = !!smsNotifications;
    if (reminderTimingDays !== undefined) user.preferences.reminderTimingDays = parseInt(reminderTimingDays, 10);
    if (notes !== undefined) user.preferences.notes = notes;

    await user.save();

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user.preferences
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  updatePreferences
};
