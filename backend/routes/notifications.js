import express from 'express';
import { authenticateToken, requireRole } from '../utils/auth.js';
import { userService, USER_ROLES } from '../services/userService.js';
import { smsService } from '../services/smsService.js';
import { slackService } from '../services/slackService.js';

const router = express.Router();

// GET /api/notifications/status - Get notification services status
router.get('/status', authenticateToken, (req, res) => {
  try {
    const smsStatus = smsService.getStatus();
    const slackStatus = slackService.getStatus();
    res.json({
      success: true,
      sms: smsStatus,
      slack: slackStatus
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/test - Send test SMS
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        error: true,
        message: 'Phone number is required'
      });
    }

    // Use custom message or default test message
    const result = message 
      ? await smsService.sendCustomMessage(phoneNumber, message)
      : await smsService.sendTestMessage(phoneNumber);

    res.json({
      success: true,
      message: 'SMS sent successfully',
      result
    });

  } catch (error) {
    res.status(400).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/shipment/approved - Send approval notification
router.post('/shipment/approved', authenticateToken, async (req, res) => {
  try {
    const { shipment, purchaserUserId } = req.body;

    if (!shipment || !purchaserUserId) {
      return res.status(400).json({
        error: true,
        message: 'Shipment data and purchaser user ID are required'
      });
    }

    // Get purchaser user info
    const purchaser = await userService.findById(purchaserUserId);
    if (!purchaser) {
      return res.status(404).json({
        error: true,
        message: 'Purchaser not found'
      });
    }

    // Check if user has SMS notifications enabled
    if (!purchaser.smsNotifications || !purchaser.phoneNumber) {
      return res.json({
        success: true,
        message: 'User does not have SMS notifications enabled or phone number',
        skipped: true
      });
    }

    // Prepare shipment data for SMS
    const shipmentData = {
      shipper: shipment.shipper,
      purchaseOrderNumber: shipment.purchaseOrderNumber,
      productNames: shipment.products?.map(p => p.productName || 'Unknown').join(', ') || 'Various products',
      totalPounds: shipment.products?.reduce((total, p) => total + (p.totalPounds || 0), 0) || 0,
      arrivalDate: new Date(shipment.estimatedArrival).toLocaleDateString(),
    };

    const result = await smsService.sendApprovalNotification(shipmentData, purchaser.phoneNumber);

    res.json({
      success: true,
      message: 'Approval notification sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending approval notification:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/shipment/rejected - Send rejection notification
router.post('/shipment/rejected', authenticateToken, async (req, res) => {
  try {
    const { shipment, purchaserUserId, rejectionReason } = req.body;

    if (!shipment || !purchaserUserId) {
      return res.status(400).json({
        error: true,
        message: 'Shipment data and purchaser user ID are required'
      });
    }

    // Get purchaser user info
    const purchaser = await userService.findById(purchaserUserId);
    if (!purchaser) {
      return res.status(404).json({
        error: true,
        message: 'Purchaser not found'
      });
    }

    // Check if user has SMS notifications enabled
    if (!purchaser.smsNotifications || !purchaser.phoneNumber) {
      return res.json({
        success: true,
        message: 'User does not have SMS notifications enabled or phone number',
        skipped: true
      });
    }

    // Prepare shipment data for SMS
    const shipmentData = {
      shipper: shipment.shipper,
      productNames: shipment.products?.map(p => p.productName || 'Unknown').join(', ') || 'Various products',
      totalPounds: shipment.products?.reduce((total, p) => total + (p.totalPounds || 0), 0) || 0,
      arrivalDate: new Date(shipment.estimatedArrival).toLocaleDateString(),
    };

    const result = await smsService.sendRejectionNotification(
      shipmentData, 
      purchaser.phoneNumber, 
      rejectionReason
    );

    res.json({
      success: true,
      message: 'Rejection notification sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending rejection notification:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/quota/warning - Send quota warning
router.post('/quota/warning', authenticateToken, requireRole(USER_ROLES.ADMIN, USER_ROLES.APPROVER), async (req, res) => {
  try {
    const { quotaData, userIds } = req.body;

    if (!quotaData || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        error: true,
        message: 'Quota data and user IDs array are required'
      });
    }

    const results = [];

    for (const userId of userIds) {
      try {
        const user = await userService.findById(userId);
        if (!user || !user.smsNotifications || !user.phoneNumber) {
          results.push({
            userId,
            success: false,
            message: 'User not found or SMS not enabled',
            skipped: true
          });
          continue;
        }

        const result = await smsService.sendQuotaWarning(quotaData, user.phoneNumber);
        results.push({
          userId,
          success: true,
          result
        });

      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Quota warning notifications processed',
      results
    });

  } catch (error) {
    console.error('Error sending quota warnings:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/broadcast - Send message to multiple users (admin only)
router.post('/broadcast', authenticateToken, requireRole(USER_ROLES.ADMIN), async (req, res) => {
  try {
    const { message, userIds, roles } = req.body;

    if (!message) {
      return res.status(400).json({
        error: true,
        message: 'Message content is required'
      });
    }

    let targetUsers = [];

    // Get users by IDs if specified
    if (userIds && Array.isArray(userIds)) {
      for (const userId of userIds) {
        const user = await userService.findById(userId);
        if (user && user.smsNotifications && user.phoneNumber) {
          targetUsers.push(user);
        }
      }
    }

    // Get users by roles if specified
    if (roles && Array.isArray(roles)) {
      for (const role of roles) {
        const roleUsers = await userService.getUsersByRole(role);
        const enabledUsers = roleUsers.filter(u => u.smsNotifications && u.phoneNumber);
        targetUsers.push(...enabledUsers);
      }
    }

    // Remove duplicates
    targetUsers = targetUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    );

    if (targetUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No users with SMS enabled found',
        sentCount: 0
      });
    }

    const results = [];

    for (const user of targetUsers) {
      try {
        const result = await smsService.sendCustomMessage(user.phoneNumber, message);
        results.push({
          userId: user.id,
          userName: user.name,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          userId: user.id,
          userName: user.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Broadcast sent to ${successCount}/${targetUsers.length} users`,
      sentCount: successCount,
      totalUsers: targetUsers.length,
      results
    });

  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// SLACK NOTIFICATION ENDPOINTS

// POST /api/notifications/slack/test - Send test Slack message
router.post('/slack/test', authenticateToken, async (req, res) => {
  try {
    const { target, message } = req.body;
    
    if (!target) {
      return res.status(400).json({
        error: true,
        message: 'Slack target (channel or user) is required'
      });
    }

    // Use custom message or default test message
    const result = message 
      ? await slackService.sendCustomMessage(target, message)
      : await slackService.sendTestMessage(target);

    res.json({
      success: true,
      message: 'Slack message sent successfully',
      result
    });

  } catch (error) {
    res.status(400).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/slack/shipment/approved - Send Slack approval notification
router.post('/slack/shipment/approved', authenticateToken, async (req, res) => {
  try {
    console.log('===========================================');
    console.log('🔍 SLACK APPROVAL NOTIFICATION REQUEST');
    console.log('===========================================');
    const { shipment, purchaserUserId } = req.body;

    if (!shipment || !purchaserUserId) {
      return res.status(400).json({
        error: true,
        message: 'Shipment data and purchaser user ID are required'
      });
    }

    // Get purchaser user info
    const purchaser = await userService.findById(purchaserUserId);
    if (!purchaser) {
      return res.status(404).json({
        error: true,
        message: 'Purchaser not found'
      });
    }

    // For now, if user doesn't have slackUserId, send to the purchasing-bot-test channel
    const slackTarget = purchaser.slackUserId || '#purchasing-bot-test';

    // Prepare shipment data for Slack message
    const shipmentData = {
      shipper: shipment.shipper,
      purchaseOrderNumber: shipment.purchaseOrderNumber,
      productNames: shipment.products?.map(p => p.productName || p.customProductName).join(', ') || 'N/A',
      totalPounds: shipment.products?.reduce((sum, p) => sum + (p.totalPounds || 0), 0) || 0,
      estimatedCost: shipment.products?.reduce((sum, p) => 
        sum + (p.items?.reduce((itemSum, item) => itemSum + ((item.pounds || 0) * (item.cost || 0)), 0) || 0), 0) || 0,
      arrivalDate: new Date(shipment.estimatedArrival).toLocaleDateString()
    };

    console.log('🔍 Slack target:', slackTarget);
    console.log('🔍 Purchaser data:', { id: purchaser.id, name: purchaser.name, slackUserId: purchaser.slackUserId });
    console.log('🔍 Shipment data for Slack:', shipmentData);

    console.log('🔍 About to call slackService.sendShipmentApproval...');
    const result = await slackService.sendShipmentApproval(slackTarget, shipmentData);
    console.log('🔍 Slack approval result:', result);

    res.json({
      success: true,
      message: 'Approval Slack notification sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending Slack approval notification:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/slack/shipment/rejected - Send Slack rejection notification
router.post('/slack/shipment/rejected', authenticateToken, async (req, res) => {
  try {
    console.log('===========================================');
    console.log('🔍 SLACK REJECTION NOTIFICATION REQUEST');
    console.log('===========================================');
    const { shipment, purchaserUserId, rejectionReason } = req.body;

    if (!shipment || !purchaserUserId) {
      return res.status(400).json({
        error: true,
        message: 'Shipment data and purchaser user ID are required'
      });
    }

    // Get purchaser user info
    const purchaser = await userService.findById(purchaserUserId);
    if (!purchaser) {
      return res.status(404).json({
        error: true,
        message: 'Purchaser not found'
      });
    }

    // For now, if user doesn't have slackUserId, send to the purchasing-bot-test channel
    const slackTarget = purchaser.slackUserId || '#purchasing-bot-test';
    console.log('🔍 Slack target:', slackTarget);
    console.log('🔍 Purchaser data:', { id: purchaser.id, name: purchaser.name, slackUserId: purchaser.slackUserId });

    // Prepare shipment data for Slack message
    const shipmentData = {
      shipper: shipment.shipper,
      productNames: shipment.products?.map(p => p.productName || p.customProductName).join(', ') || 'N/A',
      totalPounds: shipment.products?.reduce((sum, p) => sum + (p.totalPounds || 0), 0) || 0,
      rejectionReason: rejectionReason || 'Quota limits exceeded'
    };
    console.log('🔍 Shipment data for Slack:', shipmentData);

    console.log('🔍 About to call slackService.sendShipmentRejection...');
    const result = await slackService.sendShipmentRejection(slackTarget, shipmentData);
    console.log('🔍 Slack rejection result:', result);

    res.json({
      success: true,
      message: 'Rejection Slack notification sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending Slack rejection notification:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/slack/shipment/new-auto-approved - Send new auto-approved shipment notification
router.post('/slack/shipment/new-auto-approved', authenticateToken, async (req, res) => {
  try {
    console.log('===========================================');
    console.log('🔍 SLACK NEW AUTO-APPROVED SHIPMENT NOTIFICATION');
    console.log('===========================================');
    const { shipment, purchaserUserId } = req.body;

    if (!shipment || !purchaserUserId) {
      return res.status(400).json({
        error: true,
        message: 'Shipment data and purchaser user ID are required'
      });
    }

    // Get purchaser user info
    const purchaser = await userService.findById(purchaserUserId);
    if (!purchaser) {
      return res.status(404).json({
        error: true,
        message: 'Purchaser not found'
      });
    }

    // For now, if user doesn't have slackUserId, send to the purchasing-bot-test channel
    const slackTarget = purchaser.slackUserId || '#purchasing-bot-test';
    console.log('🔍 Slack target:', slackTarget);
    console.log('🔍 Purchaser data:', { id: purchaser.id, name: purchaser.name, slackUserId: purchaser.slackUserId });

    // Prepare shipment data for Slack message
    const shipmentData = {
      shipper: shipment.shipper,
      purchaseOrderNumber: shipment.purchaseOrderNumber,
      productNames: shipment.products?.map(p => p.productName || p.customProductName).join(', ') || 'N/A',
      totalPounds: shipment.products?.reduce((sum, p) => sum + (p.totalPounds || 0), 0) || 0,
      estimatedCost: shipment.products?.reduce((sum, p) => 
        sum + (p.items?.reduce((itemSum, item) => itemSum + ((item.pounds || 0) * (item.cost || 0)), 0) || 0), 0) || 0,
      arrivalDate: new Date(shipment.estimatedArrival).toLocaleDateString()
    };
    console.log('🔍 Shipment data for Slack:', shipmentData);

    console.log('🔍 About to call slackService.sendNewShipmentAutoApproved...');
    const result = await slackService.sendNewShipmentAutoApproved(slackTarget, shipmentData);
    console.log('🔍 Slack auto-approved result:', result);

    res.json({
      success: true,
      message: 'New auto-approved shipment Slack notification sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending Slack new auto-approved shipment notification:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/slack/shipment/new-pending - Send new pending shipment notification
router.post('/slack/shipment/new-pending', authenticateToken, async (req, res) => {
  try {
    console.log('===========================================');
    console.log('🔍 SLACK NEW PENDING SHIPMENT NOTIFICATION');
    console.log('===========================================');
    const { shipment, purchaserUserId } = req.body;

    if (!shipment || !purchaserUserId) {
      return res.status(400).json({
        error: true,
        message: 'Shipment data and purchaser user ID are required'
      });
    }

    // Get purchaser user info
    const purchaser = await userService.findById(purchaserUserId);
    if (!purchaser) {
      return res.status(404).json({
        error: true,
        message: 'Purchaser not found'
      });
    }

    // For now, if user doesn't have slackUserId, send to the purchasing-bot-test channel
    const slackTarget = purchaser.slackUserId || '#purchasing-bot-test';
    console.log('🔍 Slack target:', slackTarget);
    console.log('🔍 Purchaser data:', { id: purchaser.id, name: purchaser.name, slackUserId: purchaser.slackUserId });

    // Prepare shipment data for Slack message
    const shipmentData = {
      shipper: shipment.shipper,
      productNames: shipment.products?.map(p => p.productName || p.customProductName).join(', ') || 'N/A',
      totalPounds: shipment.products?.reduce((sum, p) => sum + (p.totalPounds || 0), 0) || 0,
      estimatedCost: shipment.products?.reduce((sum, p) => 
        sum + (p.items?.reduce((itemSum, item) => itemSum + ((item.pounds || 0) * (item.cost || 0)), 0) || 0), 0) || 0,
      arrivalDate: new Date(shipment.estimatedArrival).toLocaleDateString()
    };
    console.log('🔍 Shipment data for Slack:', shipmentData);

    console.log('🔍 About to call slackService.sendNewShipmentPending...');
    const result = await slackService.sendNewShipmentPending(slackTarget, shipmentData);
    console.log('🔍 Slack pending result:', result);

    res.json({
      success: true,
      message: 'New pending shipment Slack notification sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending Slack new pending shipment notification:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// POST /api/notifications/slack/interactive - Handle Slack interactive button clicks
router.post('/slack/interactive', async (req, res) => {
  try {
    // Slack sends the payload as form-encoded
    const payload = JSON.parse(req.body.payload);
    
    console.log('===========================================');
    console.log('🔍 SLACK INTERACTIVE BUTTON CLICKED');
    console.log('===========================================');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const { user, actions, channel, message } = payload;
    
    if (!actions || actions.length === 0) {
      return res.status(400).json({ error: 'No actions provided' });
    }

    const action = actions[0];
    const shipmentId = action.value; // Simple string value now
    
    console.log('🔍 Action:', action.action_id);
    console.log('🔍 Shipment ID:', shipmentId);
    console.log('🔍 Slack user:', user.name, user.id);

    // Handle approve/reject actions
    if (action.action_id === 'approve_shipment') {
      // Here we would typically:
      // 1. Look up the shipment in the database
      // 2. Update its status to approved
      // 3. Generate PO number
      // 4. Send confirmation notification
      
      // For now, we'll send a response message
      const approvalMessage = {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Shipment Approved by ${user.name}*\n\n*Shipment ID:* ${shipmentId}\n\n_PO Number will be generated and notifications sent._`
            }
          }
        ]
      };

      // Update the original message to show it's been processed
      await slackService.sendCustomMessage(channel.id, '✅ This shipment has been approved via Slack button.');
      
      res.json({ 
        response_type: 'in_channel',
        replace_original: false,
        ...approvalMessage
      });

    } else if (action.action_id === 'reject_shipment') {
      // Handle rejection
      const rejectionMessage = {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *Shipment Rejected by ${user.name}*\n\n*Shipment ID:* ${shipmentId}\n*Reason:* Quota limits exceeded\n\n_Rejection notifications sent._`
            }
          }
        ]
      };

      // Update the original message to show it's been processed
      await slackService.sendCustomMessage(channel.id, '❌ This shipment has been rejected via Slack button.');
      
      res.json({ 
        response_type: 'in_channel',
        replace_original: false,
        ...rejectionMessage
      });

    } else {
      res.status(400).json({ error: 'Unknown action' });
    }

  } catch (error) {
    console.error('Error handling Slack interactive action:', error);
    res.status(500).json({ 
      response_type: 'ephemeral',
      text: 'Sorry, there was an error processing your request. Please try again or use the web interface.'
    });
  }
});

export default router;