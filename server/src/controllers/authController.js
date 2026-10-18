const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
async function register(req, res, next) {
  try {
    const { name, email, password, role, organizationName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email already registered
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    let orgId = null;
    let validRole = role || 'individual';

    // If registering as NGO / Orphanage coordinator, create or link organization
    if (validRole === 'ngo_coordinator') {
      const org = await Organization.create({
        name: organizationName || `${name}'s Care Institution`,
        type: 'orphanage',
        contactEmail: email.toLowerCase().trim()
      });
      orgId = org._id;
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role: validRole,
      organizationId: orgId,
      organizationName: organizationName || null
    });

    if (orgId) {
      await Organization.findByIdAndUpdate(orgId, {
        $push: { authorizedCoordinatorIds: user._id }
      });
    }

    const token = createToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        preferences: user.preferences
      }
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = createToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        preferences: user.preferences
      }
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe
};
