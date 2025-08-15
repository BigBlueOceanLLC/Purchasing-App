import express from 'express';
import { generateToken, authenticateToken, requireRole } from '../utils/auth.js';
import { userService, USER_ROLES } from '../services/userService.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: true,
        message: 'Email and password are required'
      });
    }

    const user = await userService.authenticateUser(email, password);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    res.json({
      success: true,
      message: 'Login successful',
      user,
      token
    });

  } catch (error) {
    res.status(401).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/auth/signup (admin only for now)
router.post('/signup', authenticateToken, requireRole(USER_ROLES.ADMIN), async (req, res) => {
  try {
    const { email, name, password, role, phoneNumber } = req.body;

    const newUser = await userService.createUser({
      email,
      name,
      password,
      role,
      phoneNumber
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    res.status(400).json({
      error: true,
      message: error.message
    });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userService.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    const updatedUser = await userService.updateUser(req.user.userId, updates);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    res.status(400).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  // In a real app, you'd invalidate the token in a blacklist
  // For now, just return success (client will remove token)
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// GET /api/auth/users - Get all users (admin only)
router.get('/users', authenticateToken, requireRole(USER_ROLES.ADMIN), async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({
      success: true,
      users
    });

  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// GET /api/auth/test-credentials - Development endpoint to show test credentials
router.get('/test-credentials', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: true, message: 'Not found' });
  }

  res.json({
    success: true,
    message: 'Test credentials for development',
    credentials: [
      { email: 'admin@seafood.com', password: 'admin123', role: 'admin' },
      { email: 'approver@seafood.com', password: 'approver123', role: 'approver' },
      { email: 'purchaser@seafood.com', password: 'purchaser123', role: 'purchaser' }
    ]
  });
});

export default router;