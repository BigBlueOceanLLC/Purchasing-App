import twilio from 'twilio';

// Lazy initialization of Twilio client
let twilioClient = null;
let TWILIO_PHONE_NUMBER = null;
let initialized = false;

function initializeTwilio() {
  if (initialized) return;
  initialized = true;
  
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

  // Environment variables loaded

  // Initialize Twilio client (only if credentials are provided)
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    try {
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log('📱 Twilio SMS service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio:', error.message);
    }
  } else {
    console.log('⚠️  Twilio credentials not provided - SMS will be simulated');
  }
}

// SMS message templates
const SMS_TEMPLATES = {
  SHIPMENT_APPROVED: (shipmentData) => `
🟢 APPROVED: Your shipment from ${shipmentData.shipper} has been approved!
📋 PO Number: ${shipmentData.purchaseOrderNumber}
📦 Products: ${shipmentData.productNames}
⚖️ Total: ${shipmentData.totalPounds} lbs
🚚 Expected: ${shipmentData.arrivalDate}
- Seafood Purchasing Team
  `.trim(),

  SHIPMENT_REJECTED: (shipmentData) => `
🔴 REJECTED: Your shipment from ${shipmentData.shipper} was rejected.
📦 Products: ${shipmentData.productNames}
⚖️ Total: ${shipmentData.totalPounds} lbs
💬 Reason: ${shipmentData.rejectionReason || 'Quota limits exceeded'}
Please contact your approver for details.
- Seafood Purchasing Team
  `.trim(),

  QUOTA_WARNING: (quotaData) => `
⚠️ QUOTA ALERT: ${quotaData.productName} is at ${quotaData.percentage}% of weekly quota
📊 Current: ${quotaData.currentTotal} lbs / ${quotaData.maxQuota} lbs
🗓️ Week: ${quotaData.weekRange}
- Seafood Purchasing Team
  `.trim(),
};

// Phone number validation and formatting
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle US numbers (add +1 if missing)
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  } else if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  return phoneNumber; // Return as-is for international numbers
}

function validatePhoneNumber(phoneNumber) {
  const formatted = formatPhoneNumber(phoneNumber);
  if (!formatted || !formatted.startsWith('+')) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  return { valid: true, formatted };
}

// Core SMS sending function
async function sendSMS(to, message, options = {}) {
  // Initialize Twilio on first use
  initializeTwilio();
  
  const phoneValidation = validatePhoneNumber(to);
  if (!phoneValidation.valid) {
    throw new Error(`Invalid phone number: ${phoneValidation.error}`);
  }

  const formattedPhone = phoneValidation.formatted;
  
  // If Twilio is not configured, simulate sending
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.log('📱 SMS SIMULATION:');
    console.log(`To: ${formattedPhone}`);
    console.log(`From: ${TWILIO_PHONE_NUMBER || 'Not configured'}`);
    console.log(`Message: ${message}`);
    console.log('---');
    
    return {
      success: true,
      simulation: true,
      to: formattedPhone,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
      ...options,
    });

    console.log(`✅ SMS sent successfully to ${formattedPhone} (SID: ${result.sid})`);
    console.log(`   Status: ${result.status}, Direction: ${result.direction}`);
    console.log(`   From: ${result.from}, To: ${result.to}`);

    return {
      success: true,
      simulation: false,
      sid: result.sid,
      to: formattedPhone,
      from: TWILIO_PHONE_NUMBER,
      status: result.status,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`❌ Failed to send SMS to ${formattedPhone}:`, error.message);
    throw new Error(`SMS sending failed: ${error.message}`);
  }
}

// Notification service functions
export const smsService = {
  // Send shipment approval notification
  async sendApprovalNotification(shipmentData, userPhoneNumber) {
    if (!userPhoneNumber) {
      throw new Error('User phone number is required');
    }

    const message = SMS_TEMPLATES.SHIPMENT_APPROVED(shipmentData);
    return await sendSMS(userPhoneNumber, message);
  },

  // Send shipment rejection notification
  async sendRejectionNotification(shipmentData, userPhoneNumber, rejectionReason = null) {
    if (!userPhoneNumber) {
      throw new Error('User phone number is required');
    }

    const shipmentWithReason = { ...shipmentData, rejectionReason };
    const message = SMS_TEMPLATES.SHIPMENT_REJECTED(shipmentWithReason);
    return await sendSMS(userPhoneNumber, message);
  },

  // Send quota warning notification
  async sendQuotaWarning(quotaData, userPhoneNumber) {
    if (!userPhoneNumber) {
      throw new Error('User phone number is required');
    }

    const message = SMS_TEMPLATES.QUOTA_WARNING(quotaData);
    return await sendSMS(userPhoneNumber, message);
  },

  // Send custom SMS message
  async sendCustomMessage(phoneNumber, message) {
    return await sendSMS(phoneNumber, message);
  },

  // Test SMS functionality
  async sendTestMessage(phoneNumber) {
    const testMessage = `🧪 Test message from Seafood Purchasing App\nTimestamp: ${new Date().toLocaleString()}\nIf you received this, SMS is working! 🎉`;
    return await sendSMS(phoneNumber, testMessage);
  },

  // Get service status
  getStatus() {
    initializeTwilio();
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    
    return {
      enabled: !!twilioClient,
      configured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER),
      fromNumber: TWILIO_PHONE_NUMBER || 'Not configured',
      simulation: !twilioClient || !TWILIO_PHONE_NUMBER,
    };
  },

  // Validate phone number (public utility)
  validatePhone: validatePhoneNumber,
  formatPhone: formatPhoneNumber,
};

export default smsService;