import { WebClient } from '@slack/web-api';

// Lazy initialization of Slack client
let slackClient = null;
let initialized = false;

function initializeSlack() {
  if (initialized) return;
  initialized = true;
  
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  
  // Initialize Slack client (only if token is provided)
  if (SLACK_BOT_TOKEN) {
    try {
      slackClient = new WebClient(SLACK_BOT_TOKEN);
      console.log('💬 Slack service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Slack:', error.message);
    }
  } else {
    console.log('⚠️  Slack bot token not provided - Slack notifications will be simulated');
  }
}

// Slack message templates using Block Kit
const SLACK_TEMPLATES = {
  SHIPMENT_APPROVED: (shipmentData) => ({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ Shipment Approved'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Shipper:*\n${shipmentData.shipper}`
          },
          {
            type: 'mrkdwn',
            text: `*PO Number:*\n${shipmentData.purchaseOrderNumber}`
          },
          {
            type: 'mrkdwn',
            text: `*Products:*\n${shipmentData.productNames}`
          },
          {
            type: 'mrkdwn',
            text: `*Total Weight:*\n${shipmentData.totalPounds} lbs`
          },
          {
            type: 'mrkdwn',
            text: `*Expected Arrival:*\n${shipmentData.arrivalDate}`
          },
          {
            type: 'mrkdwn',
            text: `*Estimated Cost:*\n$${shipmentData.estimatedCost}`
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🐟 _Seafood Purchasing Team_'
          }
        ]
      }
    ]
  }),

  SHIPMENT_REJECTED: (shipmentData) => ({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ Shipment Rejected'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Shipper:*\n${shipmentData.shipper}`
          },
          {
            type: 'mrkdwn',
            text: `*Products:*\n${shipmentData.productNames}`
          },
          {
            type: 'mrkdwn',
            text: `*Total Weight:*\n${shipmentData.totalPounds} lbs`
          },
          {
            type: 'mrkdwn',
            text: `*Reason:*\n${shipmentData.rejectionReason || 'Quota limits exceeded'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '💬 _Please contact your approver for more details._'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🐟 _Seafood Purchasing Team_'
          }
        ]
      }
    ]
  }),

  QUOTA_WARNING: (quotaData) => ({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Quota Alert'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Product:*\n${quotaData.productName}`
          },
          {
            type: 'mrkdwn',
            text: `*Usage:*\n${quotaData.percentage}% of quota`
          },
          {
            type: 'mrkdwn',
            text: `*Current Total:*\n${quotaData.currentTotal} lbs`
          },
          {
            type: 'mrkdwn',
            text: `*Max Quota:*\n${quotaData.maxQuota} lbs`
          },
          {
            type: 'mrkdwn',
            text: `*Week:*\n${quotaData.weekRange}`
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🐟 _Seafood Purchasing Team_'
          }
        ]
      }
    ]
  }),

  NEW_SHIPMENT_AUTO_APPROVED: (shipmentData) => ({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚢 New Shipment - Auto Approved'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Shipper:*\n${shipmentData.shipper}`
          },
          {
            type: 'mrkdwn',
            text: `*PO Number:*\n${shipmentData.purchaseOrderNumber}`
          },
          {
            type: 'mrkdwn',
            text: `*Products:*\n${shipmentData.productNames}`
          },
          {
            type: 'mrkdwn',
            text: `*Total Weight:*\n${shipmentData.totalPounds} lbs`
          },
          {
            type: 'mrkdwn',
            text: `*Expected Arrival:*\n${shipmentData.arrivalDate}`
          },
          {
            type: 'mrkdwn',
            text: `*Estimated Cost:*\n$${shipmentData.estimatedCost}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '✅ _This shipment was automatically approved as it fits within quota limits._'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🐟 _Seafood Purchasing Team_'
          }
        ]
      }
    ]
  }),

  NEW_SHIPMENT_PENDING: (shipmentData) => ({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⏳ New Shipment - Pending Approval'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Shipper:*\n${shipmentData.shipper}`
          },
          {
            type: 'mrkdwn',
            text: `*Products:*\n${shipmentData.productNames}`
          },
          {
            type: 'mrkdwn',
            text: `*Total Weight:*\n${shipmentData.totalPounds} lbs`
          },
          {
            type: 'mrkdwn',
            text: `*Expected Arrival:*\n${shipmentData.arrivalDate}`
          },
          {
            type: 'mrkdwn',
            text: `*Estimated Cost:*\n$${shipmentData.estimatedCost}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '⚠️ _This shipment requires approval as it exceeds quota limits and is awaiting review._'
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve'
            },
            style: 'primary',
            action_id: 'approve_shipment',
            value: shipmentData.shipmentId || 'unknown'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Reject'
            },
            style: 'danger',
            action_id: 'reject_shipment',
            value: shipmentData.shipmentId || 'unknown'
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🐟 _Seafood Purchasing Team_'
          }
        ]
      }
    ]
  })
};

// Core Slack message sending function
async function sendSlackMessage(target, message, options = {}) {
  // Initialize Slack on first use
  initializeSlack();
  
  // If Slack is not configured, simulate sending
  if (!slackClient) {
    console.log('💬 SLACK SIMULATION:');
    console.log(`Target: ${target} (${options.targetType || 'user'})`);
    console.log('Message Blocks:', JSON.stringify(message.blocks, null, 2));
    console.log('---');
    
    return {
      success: true,
      simulation: true,
      target,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    let result;
    
    // Send to channel or user based on target format
    if (target.startsWith('#') || target.startsWith('C')) {
      // Channel message
      result = await slackClient.chat.postMessage({
        channel: target,
        blocks: message.blocks,
        text: message.fallbackText || 'Seafood Purchasing Notification',
        ...options
      });
    } else if (target.startsWith('@') || target.startsWith('U')) {
      // Direct message to user
      const userId = target.startsWith('@') ? target.slice(1) : target;
      result = await slackClient.chat.postMessage({
        channel: userId,
        blocks: message.blocks,
        text: message.fallbackText || 'Seafood Purchasing Notification',
        ...options
      });
    } else {
      throw new Error('Invalid target format. Use #channel, @user, or user/channel IDs');
    }

    console.log(`✅ Slack message sent successfully to ${target} (ts: ${result.ts})`);

    return {
      success: true,
      simulation: false,
      target,
      messageTs: result.ts,
      channel: result.channel,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Slack message sending failed to ${target}:`, error.message);
    throw new Error(`Slack message sending failed: ${error.message}`);
  }
}

// Slack service object
const slackService = {
  // Send shipment approval notification
  async sendShipmentApproval(target, shipmentData) {
    const message = SLACK_TEMPLATES.SHIPMENT_APPROVED(shipmentData);
    return await sendSlackMessage(target, message);
  },

  // Send shipment rejection notification
  async sendShipmentRejection(target, shipmentData) {
    const message = SLACK_TEMPLATES.SHIPMENT_REJECTED(shipmentData);
    return await sendSlackMessage(target, message);
  },

  // Send quota warning
  async sendQuotaWarning(target, quotaData) {
    const message = SLACK_TEMPLATES.QUOTA_WARNING(quotaData);
    return await sendSlackMessage(target, message);
  },

  // Send new shipment auto-approved notification
  async sendNewShipmentAutoApproved(target, shipmentData) {
    const message = SLACK_TEMPLATES.NEW_SHIPMENT_AUTO_APPROVED(shipmentData);
    return await sendSlackMessage(target, message);
  },

  // Send new shipment pending approval notification
  async sendNewShipmentPending(target, shipmentData) {
    const message = SLACK_TEMPLATES.NEW_SHIPMENT_PENDING(shipmentData);
    return await sendSlackMessage(target, message);
  },

  // Send custom message
  async sendCustomMessage(target, text, options = {}) {
    const message = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text
          }
        }
      ],
      fallbackText: text
    };
    return await sendSlackMessage(target, message, options);
  },

  // Test Slack functionality
  async sendTestMessage(target) {
    const testMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 Test Message'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Test message from Seafood Purchasing App*\n\nTimestamp: ${new Date().toLocaleString()}\n\nIf you received this, Slack notifications are working! 🎉`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '🐟 _Seafood Purchasing Team_'
            }
          ]
        }
      ],
      fallbackText: `🧪 Test message from Seafood Purchasing App - ${new Date().toLocaleString()}`
    };
    return await sendSlackMessage(target, testMessage);
  },

  // Get service status
  getStatus() {
    initializeSlack();
    const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
    
    return {
      enabled: !!slackClient,
      configured: !!SLACK_BOT_TOKEN,
      simulation: !slackClient,
    };
  },
};

export { slackService };
export default slackService;