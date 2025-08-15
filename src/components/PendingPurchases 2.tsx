import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { generatePurchaseOrderNumber } from '../utils/purchaseOrderUtils';
import { format } from 'date-fns';
import { Clock, CheckCircle, AlertTriangle, Package, Edit3 } from 'lucide-react';
import type { Shipment } from '../types';

interface PendingPurchasesProps {
  onEditShipment: (shipment: Shipment) => void;
}

const PendingPurchases: React.FC<PendingPurchasesProps> = ({ onEditShipment }) => {
  const { state, dispatch } = useAppState();
  const [processingShipmentId, setProcessingShipmentId] = useState<string | null>(null);

  const pendingShipments = state.shipments.filter(s => s.approvalStatus === 'pending');

  const handleApproveShipment = (shipment: Shipment) => {
    setProcessingShipmentId(shipment.id);
    
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
    
    dispatch({ type: 'EDIT_SHIPMENT', shipment: approvedShipment });
    setProcessingShipmentId(null);
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

  if (pendingShipments.length === 0) {
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
        </p>
      </header>

      <div className="space-y-6">
        {pendingShipments.map(shipment => (
          <div key={shipment.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-100 p-2 rounded-full">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {shipment.shipper}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                        Pending Approval
                      </span>
                      <span>•</span>
                      <span>{format(shipment.purchaseDate, 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEditShipment(shipment)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Edit shipment"
                  >
                    <Edit3 className="w-5 h-5" />
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
                  <div className="flex items-center space-x-2 text-sm text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>This shipment requires approval due to quota limits</span>
                  </div>
                  
                  <button
                    onClick={() => handleApproveShipment(shipment)}
                    disabled={processingShipmentId === shipment.id}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
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
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingPurchases;