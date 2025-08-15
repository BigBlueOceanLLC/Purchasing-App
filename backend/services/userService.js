import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyPassword } from '../utils/auth.js';

// In-memory user storage (for development - will be replaced with database)
const users = new Map();
const sessions = new Map(); // Track active sessions

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  APPROVER: 'approver', 
  PURCHASER: 'purchaser'
};

// Create default admin user for testing
async function createDefaultUsers() {
  if (users.size === 0) {
    const adminPassword = await hashPassword('admin123');
    const approverPassword = await hashPassword('approver123');
    const purchaserPassword = await hashPassword('purchaser123');

    const defaultUsers = [
      {
        id: uuidv4(),
        email: 'victorc@bigblueocean.net',
        name: 'Victor Courtien',
        role: USER_ROLES.ADMIN,
        password: adminPassword,
        phoneNumber: '+15165211701',
        smsNotifications: true,
        slackUserId: null, // Set to actual Slack user ID when available
        slackNotifications: true,
        createdAt: new Date(),
        isActive: true
      },
      {
        id: uuidv4(),
        email: 'approver@seafood.com', 
        name: 'John Approver',
        role: USER_ROLES.APPROVER,
        password: approverPassword,
        phoneNumber: '+15165211701',
        smsNotifications: true,
        slackUserId: null, // Set to actual Slack user ID when available
        slackNotifications: true,
        createdAt: new Date(),
        isActive: true
      },
      {
        id: uuidv4(),
        email: 'purchaser@seafood.com',
        name: 'Jane Purchaser', 
        role: USER_ROLES.PURCHASER,
        password: purchaserPassword,
        phoneNumber: '+15165211701',
        smsNotifications: true,
        slackUserId: null, // Set to actual Slack user ID when available
        slackNotifications: true,
        createdAt: new Date(),
        isActive: true
      }
    ];

    for (const user of defaultUsers) {
      users.set(user.email, user);
    }

    console.log('📋 Default test users created:');
    console.log('   Admin: victorc@bigblueocean.net / admin123');
    console.log('   Approver: approver@seafood.com / approver123');
    console.log('   Purchaser: purchaser@seafood.com / purchaser123');
  }
}

// Initialize default users
createDefaultUsers();

// User validation
function validateUserInput(userData) {
  const { email, name, password, role, phoneNumber } = userData;
  const errors = [];

  if (!email || !email.includes('@')) {
    errors.push('Valid email is required');
  }
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  if (!role || !Object.values(USER_ROLES).includes(role)) {
    errors.push(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`);
  }
  if (phoneNumber && !phoneNumber.match(/^\+?1?-?\d{3}-?\d{3}-?\d{4}$/)) {
    errors.push('Phone number format invalid (use +1-555-123-4567 or similar)');
  }

  return errors;
}

// User service functions
export const userService = {
  // Find user by email
  async findByEmail(email) {
    return users.get(email.toLowerCase());
  },

  // Find user by ID
  async findById(userId) {
    for (const user of users.values()) {
      if (user.id === userId) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
    }
    return null;
  },

  // Create new user
  async createUser(userData) {
    const errors = validateUserInput(userData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const { email, name, password, role, phoneNumber } = userData;
    const emailLower = email.toLowerCase();

    if (users.has(emailLower)) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: uuidv4(),
      email: emailLower,
      name,
      role,
      password: hashedPassword,
      phoneNumber: phoneNumber || null,
      smsNotifications: true,
      createdAt: new Date(),
      isActive: true
    };

    users.set(emailLower, newUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // Authenticate user
  async authenticateUser(email, password) {
    const user = await this.findByEmail(email);
    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Update user profile
  async updateUser(userId, updates) {
    const user = await this.findUserWithPassword(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const allowedUpdates = ['name', 'phoneNumber', 'smsNotifications'];
    const validUpdates = {};
    
    for (const key in updates) {
      if (allowedUpdates.includes(key)) {
        validUpdates[key] = updates[key];
      }
    }

    // Validate phone number if being updated
    if (validUpdates.phoneNumber && !validUpdates.phoneNumber.match(/^\+?1?-?\d{3}-?\d{3}-?\d{4}$/)) {
      throw new Error('Phone number format invalid');
    }

    const updatedUser = { ...user, ...validUpdates, updatedAt: new Date() };
    users.set(user.email, updatedUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  },

  // Get all users (admin only)
  async getAllUsers() {
    const allUsers = Array.from(users.values()).map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    return allUsers.sort((a, b) => a.name.localeCompare(b.name));
  },

  // Helper to find user with password (internal use)
  async findUserWithPassword(userId) {
    for (const user of users.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return null;
  },

  // Get users by role (for notifications)
  async getUsersByRole(role) {
    const roleUsers = Array.from(users.values())
      .filter(user => user.role === role && user.isActive)
      .map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    return roleUsers;
  }
};

export default userService;