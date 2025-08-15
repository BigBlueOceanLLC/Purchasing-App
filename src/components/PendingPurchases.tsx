import React, { useState, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { generatePurchaseOrderNumber } from '../utils/purchaseOrderUtils';
import { format, differenceInDays } from 'date-fns';
import { Clock, CheckCircle, AlertTriangle, Package, Edit3, Trash2, XCircle, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import DeleteConfirmation from './DeleteConfirmation';
import { api } from '../utils/api';
import type { Shipment } from '../types';

interface PendingPurchasesProps {
  onEditShipment: (shipment: Shipment) => void;
}

const PendingPurchases: React.FC<PendingPurchasesProps> = ({ onEditShipment }) => {
  const { state, dispatch } = useAppState();
  const { token } = useAuth();
  const [processingShipmentId, setProcessingShipmentId] = useState<string | null>(null);
  const [rejectingShipmentId, setRejectingShipmentId] = useState<string | null>(null);
  const [shipmentToDelete, setShipmentToDelete] = useState<Shipment | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  const pendingShipments = state.shipments.filter(s => s.approvalStatus === 'pending');
  const rejectedShipments = state.shipments.filter(s => s.approvalStatus === 'rejected')
    .sort((a, b) => {
      const dateA = a.rejectedAt || a.createdAt;
      const dateB = b.rejectedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

  // Clean up old rejected shipments on component mount and periodically
  useEffect(() => {
    dispatch({ type: 'DELETE_OLD_REJECTED' });
    const interval = setInterval(() => {
      dispatch({ type: 'DELETE_OLD_REJECTED' });
    }, 1000 * 60 * 60 * 24); // Check daily
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleApproveShipment = async (shipment: Shipment) => {
    setProcessingShipmentId(shipment.id);
    
    try {
      // Generate PO number for the approved shipment
      const existingPONumbers = state.shipments
        .filter(s => s.approvalStatus === 'approved' && s.purchaseOrderNumber)
        .map(s => s.purchaseOrderNumber!);
      
      const purchaseOrderNumber = generatePurchaseOrderNumber(existingPONumbers);
      
      const approvedShipment = {
        ...shipment,
        approvalStatus: 'approved' as const,
        purchaseOrderNumber,
      };
      
      // Update the shipment in local state
      dispatch({ type: 'EDIT_SHIPMENT', shipment: approvedShipment });

      // Send SMS notification (simulate sending to first purchaser user)
      // In a real app, you'd store the purchaser user ID with the shipment
      if (token) {
        try {
          const shipmentData = {
            ...approvedShipment,
            products: shipment.products.map(p => ({
              ...p,
              productName: state.products.find(prod => prod.id === p.productId)?.name || 'Unknown Product'
            }))
          };

          // Use the real purchaser user ID from the shipment
          const purchaserUserId = approvedShipment.purchaserId;
          
          if (purchaserUserId) {
            // Send both SMS and Slack notifications
            await Promise.allSettled([
              api.notifications.sendApprovalNotification(token, shipmentData, purchaserUserId),
              api.slack.sendApprovalNotification(token, shipmentData, purchaserUserId)
            ]);
          } else {
            console.warn('⚠️ No purchaser ID found on shipment, skipping notifications');
          }
          console.log('✅ Approval notifications sent successfully');
        } catch (notificationError) {
          console.warn('⚠️ Notification failed:', notificationError);
          // Don't fail the approval if notifications fail
        }
      }

    } catch (error) {
      console.error('Error approving shipment:', error);
    } finally {
      setProcessingShipmentId(null);
    }
  };

  const handleRejectShipment = async (shipment: Shipment) => {
    setRejectingShipmentId(shipment.id);
    
    try {
      // Update the shipment in local state
      dispatch({ type: 'REJECT_SHIPMENT', shipmentId: shipment.id });

      // Send SMS notification for rejection
      if (token) {
        try {
          const shipmentData = {
            ...shipment,
            products: shipment.products.map(p => ({
              ...p,
              productName: state.products.find(prod => prod.id === p.productId)?.name || 'Unknown Product'
            }))
          };

          // Use the real purchaser user ID from the shipment
          const purchaserUserId = shipment.purchaserId;
          const rejectionReason = 'Quota limits exceeded'; // Could be made configurable
          
          if (purchaserUserId) {
            // Send both SMS and Slack notifications
            await Promise.allSettled([
              api.notifications.sendRejectionNotification(token, shipmentData, purchaserUserId, rejectionReason),
              api.slack.sendRejectionNotification(token, shipmentData, purchaserUserId, rejectionReason)
            ]);
          } else {
            console.warn('⚠️ No purchaser ID found on shipment, skipping notifications');
          }
          console.log('✅ Rejection notifications sent successfully');
        } catch (notificationError) {
          console.warn('⚠️ Notification failed:', notificationError);
          // Don't fail the rejection if notifications fail
        }
      }

    } catch (error) {
      console.error('Error rejecting shipment:', error);
    } finally {
      setTimeout(() => setRejectingShipmentId(null), 500);
    }
  };

  const handleUnrejectShipment = (shipmentId: string) => {
    dispatch({ type: 'UNREJECT_SHIPMENT', shipmentId });
  };

  const handleDeleteShipment = (shipment: Shipment) => {
    setShipmentToDelete(shipment);
  };

  const confirmDeleteShipment = () => {
    if (shipmentToDelete) {
      dispatch({ type: 'DELETE_SHIPMENT', shipmentId: shipmentToDelete.id });
      setShipmentToDelete(null);
    }
  };

  const cancelDeleteShipment = () => {
    setShipmentToDelete(null);
  };

  const getTotalPounds = (shipment: Shipment): number => {
    return shipment.products.reduce((total, product) => total + product.totalPounds, 0);
  };

  const getTotalCost = (shipment: Shipment): number => {
    return shipment.products.reduce((total, product) => {
      return total + product.items.reduce((itemTotal, item) => {
        return itemTotal + (item.pounds * (item.cost || 0));
      }, 0);
    }, 0);
  };

  const getProductNames = (shipment: Shipment): string => {
    return shipment.products.map(p => {
      if (p.productId === 'other' && p.customProductName) {
        return p.customProductName;
      }
      const product = state.products.find(prod => prod.id === p.productId);
      return product?.name || 'Unknown';
    }).join(', ');
  };

  const getDaysSinceRejection = (rejectedAt: Date | undefined): number => {
    if (!rejectedAt) return 0;
    return differenceInDays(new Date(), rejectedAt);
  };

  const renderShipmentCard = (shipment: Shipment, isPending: boolean = true) => {
    const daysSinceRejection = getDaysSinceRejection(shipment.rejectedAt);
    const daysUntilDeletion = 30 - daysSinceRejection;

    return (
      <div key={shipment.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`${isPending ? 'bg-yellow-100' : 'bg-red-100'} p-2 rounded-full`}>
                {isPending ? (
                  <Clock className="w-6 h-6 text-yellow-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {shipment.shipper}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className={`${isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} px-2 py-1 rounded-full text-xs font-medium`}>
                    {isPending ? 'Pending Approval' : 'Rejected'}
                  </span>
                  <span>•</span>
                  <span>{format(shipment.purchaseDate, 'MMM d, yyyy')}</span>
                  {!isPending && shipment.rejectedAt && (
                    <>
                      <span>•</span>
                      <span className="text-red-600">
                        Rejected {daysSinceRejection} day{daysSinceRejection !== 1 ? 's' : ''} ago
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              {isPending && (
                <button
                  onClick={() => onEditShipment(shipment)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Edit shipment"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => handleDeleteShipment(shipment)}
                className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete shipment"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Package className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Products</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 truncate" title={getProductNames(shipment)}>
                {getProductNames(shipment)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-600 block mb-1">Total Weight</span>
              <p className="text-lg font-semibold text-gray-900">
                {getTotalPounds(shipment).toFixed(1)} lbs
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-600 block mb-1">Estimated Cost</span>
              <p className="text-lg font-semibold text-gray-900">
                ${getTotalCost(shipment).toFixed(2)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-600 block mb-1">Arrival Date</span>
              <p className="text-lg font-semibold text-gray-900">
                {format(shipment.estimatedArrival, 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm">
                {isPending ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-600">This shipment requires approval due to quota limits</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">
                      {daysUntilDeletion > 0 
                        ? `Will be permanently deleted in ${daysUntilDeletion} day${daysUntilDeletion !== 1 ? 's' : ''}`
                        : 'Will be deleted soon'}
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex space-x-2">
                {isPending ? (
                  <>
                    <button
                      onClick={() => handleRejectShipment(shipment)}
                      disabled={rejectingShipmentId === shipment.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                    >
                      {rejectingShipmentId === shipment.id ? (
                        <span className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Rejecting...</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleApproveShipment(shipment)}
                      disabled={processingShipmentId === shipment.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
                    >
                      {processingShipmentId === shipment.id ? (
                        <span className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Approving...</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </span>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleUnrejectShipment(shipment.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <RotateCcw className="w-4 h-4" />
                      <span>Undo Rejection</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (pendingShipments.length === 0 && rejectedShipments.length === 0) {
    return (
      <div className="max-w-[95vw] lg:max-w-[85vw] xl:max-w-[80vw] mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-ocean-900 mb-2">
            Pending Purchases
          </h1>
          <p className="text-ocean-600 text-lg">
            Shipments awaiting approval
          </p>
        </header>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg max-w-md">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              All Caught Up!
            </h3>
            <p className="text-gray-600 text-lg">
              No shipments are currently pending approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[95vw] lg:max-w-[85vw] xl:max-w-[80vw] mx-auto px-4 py-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-ocean-900 mb-2">
          Pending Purchases
        </h1>
        <p className="text-ocean-600 text-lg">
          {pendingShipments.length} shipment{pendingShipments.length !== 1 ? 's' : ''} awaiting approval
          {rejectedShipments.length > 0 && `, ${rejectedShipments.length} rejected`}
        </p>
      </header>

      {/* Pending Shipments */}
      {pendingShipments.length > 0 && (
        <div className="space-y-6 mb-8">
          {pendingShipments.map(shipment => renderShipmentCard(shipment, true))}
        </div>
      )}

      {/* Rejected Shipments Section */}
      {rejectedShipments.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowRejected(!showRejected)}
            className="flex items-center space-x-2 text-lg font-semibold text-gray-700 hover:text-gray-900 mb-4"
          >
            {showRejected ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <span>Rejected Shipments ({rejectedShipments.length})</span>
          </button>
          
          {showRejected && (
            <div className="space-y-6">
              {rejectedShipments.map(shipment => renderShipmentCard(shipment, false))}
            </div>
          )}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {shipmentToDelete && (
        <DeleteConfirmation
          shipment={shipmentToDelete}
          onConfirm={confirmDeleteShipment}
          onCancel={cancelDeleteShipment}
        />
      )}
    </div>
  );
};

export default PendingPurchases;