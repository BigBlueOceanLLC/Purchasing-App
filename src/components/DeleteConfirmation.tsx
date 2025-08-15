import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import type { Shipment } from '../types';

interface DeleteConfirmationProps {
  shipment: Shipment;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({ shipment, onConfirm, onCancel }) => {
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Delete Shipment</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Shipment Details */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900 text-lg">{shipment.shipper}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                shipment.approvalStatus === 'approved' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {shipment.approvalStatus === 'approved' ? '✓ Approved' : '⏳ Pending'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Products:</span>
                <span className="font-medium">{shipment.products.length} item{shipment.products.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Weight:</span>
                <span className="font-medium">{getTotalPounds().toFixed(1)} lbs</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Cost:</span>
                <span className="font-medium">${getTotalCost().toFixed(2)}</span>
              </div>
              {shipment.purchaseOrderNumber && (
                <div className="flex justify-between">
                  <span>PO Number:</span>
                  <span className="font-medium font-mono">{shipment.purchaseOrderNumber}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-900 mb-2">⚠️ What will happen:</h3>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• Shipment will be permanently removed</li>
              <li>• All associated products and purchases will be deleted</li>
              <li>• Quota calculations will be updated automatically</li>
              {shipment.purchaseOrderNumber && (
                <li>• Purchase order {shipment.purchaseOrderNumber} will be invalidated</li>
              )}
            </ul>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            Are you sure you want to delete this shipment? This action cannot be undone and will affect your quota calculations.
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Shipment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation;