import React, { useState } from 'react';
import { CheckCircle, Clock, Copy, Check, X, FileText } from 'lucide-react';
import type { Shipment } from '../types';

interface ShipmentConfirmationProps {
  shipment: Shipment;
  onClose: () => void;
}

const ShipmentConfirmation: React.FC<ShipmentConfirmationProps> = ({ shipment, onClose }) => {
  const [copied, setCopied] = useState(false);
  const isApproved = shipment.approvalStatus === 'approved';

  const copyToClipboard = async () => {
    if (!shipment.purchaseOrderNumber) return;
    
    try {
      await navigator.clipboard.writeText(shipment.purchaseOrderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getTotalPounds = (): number => {
    return shipment.products.reduce((total, product) => total + product.totalPounds, 0);
  };

  const getTotalCost = (): number => {
    return shipment.products.reduce((total, product) => {
      return total + product.items.reduce((itemTotal, item) => {
        return itemTotal + (item.pounds * (item.cost || 0));
      }, 0);
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="relative p-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isApproved ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {isApproved ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <Clock className="w-8 h-8 text-yellow-600" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isApproved ? 'Shipment Approved!' : 'Shipment Pending Approval'}
          </h2>
          
          <p className="text-gray-600 text-lg mb-6">
            {isApproved 
              ? 'Your shipment has been automatically approved and assigned a purchase order number.'
              : 'Your shipment requires manual approval due to quota limits. It will be reviewed shortly.'
            }
          </p>
        </div>

        {/* Shipment Details */}
        <div className="px-8 pb-6">
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Shipper</span>
              <span className="font-semibold text-gray-900">{shipment.shipper}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total Weight</span>
              <span className="font-semibold text-gray-900">{getTotalPounds().toFixed(2)} lbs</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Estimated Cost</span>
              <span className="font-semibold text-gray-900">${getTotalCost().toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Products</span>
              <span className="font-semibold text-gray-900">{shipment.products.length} item{shipment.products.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Purchase Order Number Section */}
        {isApproved && shipment.purchaseOrderNumber ? (
          <div className="px-8 pb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center mb-3">
                <FileText className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">Purchase Order Number</span>
              </div>
              
              <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-green-200">
                <span className="text-2xl font-bold text-green-900 font-mono tracking-wider">
                  {shipment.purchaseOrderNumber}
                </span>
                
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-sm text-green-700 mt-2">
                Use this purchase order number for tracking and reference.
              </p>
            </div>
          </div>
        ) : (
          !isApproved && (
            <div className="px-8 pb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center mb-3">
                  <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">Awaiting Approval</span>
                </div>
                
                <p className="text-yellow-700 mb-4">
                  This shipment exceeds quota limits and requires manual approval. You can view and manage pending shipments in the "Pending" tab.
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800 font-medium">
                    📋 No purchase order number will be assigned until approval is granted.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* Actions */}
        <div className="px-8 pb-8">
          <button
            onClick={onClose}
            className="w-full bg-ocean-600 hover:bg-ocean-700 text-white py-3 px-6 rounded-xl font-semibold text-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipmentConfirmation;