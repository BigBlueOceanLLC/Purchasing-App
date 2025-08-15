import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { isCurrentWeek } from '../utils/dateUtils';
import { isSameDay, format, startOfDay, differenceInDays } from 'date-fns';
import { ChevronDown, ChevronRight, Truck, Calendar, Package, Edit2, CheckCircle, Clock, FileText, Copy, Trash2 } from 'lucide-react';
import DeleteConfirmation from './DeleteConfirmation';
import type { Shipment } from '../types';
import type { DateRange } from '../utils/analytics';
import { formatDateRange, isDateInRange } from '../utils/analytics';

interface PurchasesListProps {
  onEditShipment?: (shipment: Shipment) => void;
  selectedDate?: Date | null;
  selectedDateRange?: DateRange | null;
  isDesktopView?: boolean;
}

const PurchasesList: React.FC<PurchasesListProps> = ({ onEditShipment, selectedDate, selectedDateRange, isDesktopView }) => {
  const { state, dispatch } = useAppState();
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'current-week' | 'recent'>('recent');
  const [copiedPO, setCopiedPO] = useState<string | null>(null);
  const [shipmentToDelete, setShipmentToDelete] = useState<Shipment | null>(null);

  const toggleShipment = (shipmentId: string) => {
    const newExpanded = new Set(expandedShipments);
    if (newExpanded.has(shipmentId)) {
      newExpanded.delete(shipmentId);
    } else {
      newExpanded.add(shipmentId);
    }
    setExpandedShipments(newExpanded);
  };

  const copyPONumber = async (poNumber: string) => {
    try {
      await navigator.clipboard.writeText(poNumber);
      setCopiedPO(poNumber);
      setTimeout(() => setCopiedPO(null), 2000);
    } catch (err) {
      console.error('Failed to copy PO number:', err);
    }
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

  // Filter shipments based on selected date range or filter (excluding rejected)
  const filteredShipments = state.shipments.filter(shipment => {
    // Always exclude rejected shipments
    if (shipment.approvalStatus === 'rejected') {
      return false;
    }
    
    // If desktop view with selected date range, filter by that range
    if (isDesktopView && selectedDateRange) {
      return isDateInRange(shipment.estimatedArrival, selectedDateRange);
    }
    
    // If desktop view with selected single date, filter by that date
    if (isDesktopView && selectedDate) {
      return isSameDay(shipment.estimatedArrival, selectedDate);
    }
    
    // Otherwise use the filter buttons
    if (filter === 'current-week') {
      return isCurrentWeek(shipment.estimatedArrival);
    }
    if (filter === 'recent') {
      // Show shipments from the last 30 days based on creation date, or arriving in the next 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      return (
        shipment.createdAt >= thirtyDaysAgo || 
        (shipment.estimatedArrival >= now && shipment.estimatedArrival <= thirtyDaysFromNow)
      );
    }
    return true;
  });

  // Sort shipments by estimated arrival date (closest first)
  const sortedShipments = [...filteredShipments].sort((a, b) => 
    a.estimatedArrival.getTime() - b.estimatedArrival.getTime()
  );

  const getStatusInfo = (shipment: Shipment) => {
    const today = startOfDay(new Date());
    const arrivalDate = startOfDay(shipment.estimatedArrival);
    const daysDiff = differenceInDays(arrivalDate, today);
    
    if (daysDiff < 0) {
      return { status: 'arrived', color: 'bg-green-100 text-green-800', label: 'Arrived' };
    } else if (daysDiff === 0) {
      return { status: 'today', color: 'bg-blue-100 text-blue-800', label: 'Arriving Today' };
    } else if (daysDiff <= 2) {
      return { status: 'soon', color: 'bg-yellow-100 text-yellow-800', label: `Arriving in ${daysDiff}d` };
    } else {
      return { status: 'future', color: 'bg-gray-100 text-gray-800', label: `Arriving in ${daysDiff}d` };
    }
  };

  return (
    <div className={`${isDesktopView ? '' : 'max-w-[95vw] lg:max-w-[85vw] xl:max-w-[80vw] mx-auto px-4 py-6'}`}>
      {!isDesktopView && (
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-ocean-900 mb-4">
            Purchase History
          </h1>
          
          {/* Filter buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('recent')}
              className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                filter === 'recent'
                  ? 'bg-ocean-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setFilter('current-week')}
              className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                filter === 'current-week'
                  ? 'bg-ocean-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-ocean-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Purchases
            </button>
          </div>
        </header>
      )}
      
      {isDesktopView && (selectedDateRange || selectedDate) && (
        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-ocean-900 mb-2">
            {selectedDateRange ? (
              `Shipments for ${formatDateRange(selectedDateRange)}`
            ) : selectedDate ? (
              `Shipments for ${format(selectedDate, 'MMMM d, yyyy')}`
            ) : (
              'Shipments'
            )}
          </h2>
        </header>
      )}

      <div className="space-y-4">
        {sortedShipments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className={`font-medium mb-2 ${isDesktopView ? 'text-base' : 'text-lg'}`}>No shipments found</p>
            <p className={isDesktopView ? 'text-sm' : 'text-base'}>Add your first shipment using the + button on the dashboard</p>
          </div>
        ) : (
          sortedShipments.map((shipment) => {
            const statusInfo = getStatusInfo(shipment);
            const isExpanded = expandedShipments.has(shipment.id);
            const totalProducts = shipment.products.length;
            const totalPounds = shipment.products.reduce((sum, p) => sum + p.totalPounds, 0);
            const totalCost = shipment.products.reduce((sum, p) => sum + p.items.reduce((itemSum, item) => itemSum + (item.pounds * (item.cost || 0)), 0), 0);

            return (
              <div key={shipment.id} className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
                isDesktopView ? '' : 'shadow-md rounded-xl'
              }`}>
                {/* Shipment Header - Compact Design */}
                <div className={isDesktopView ? "p-3" : "p-6"}>
                  {/* Top Row: Shipper + Status + Actions */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className={`${isDesktopView ? 'w-4 h-4' : 'w-5 h-5'} text-ocean-600 flex-shrink-0`} />
                        <h3 className={`font-semibold text-gray-900 truncate ${
                          isDesktopView ? 'text-base' : 'text-xl'
                        }`}>
                          {shipment.shipper}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full ${isDesktopView ? 'text-sm' : 'text-base'} font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {/* Approval Status Badge */}
                        <span className={`px-2 py-1 rounded-full ${isDesktopView ? 'text-xs' : 'text-sm'} font-medium flex items-center gap-1 ${
                          shipment.approvalStatus === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {shipment.approvalStatus === 'approved' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      {onEditShipment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditShipment(shipment);
                          }}
                          className="text-ocean-600 hover:text-ocean-800 hover:bg-ocean-50 p-1.5 rounded-md transition-all duration-150"
                          title="Edit shipment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShipment(shipment);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-all duration-150"
                        title="Delete shipment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleShipment(shipment.id)}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-md transition-all duration-150"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Compact Info Grid */}
                  <div className={`space-y-1 ${isDesktopView ? 'text-sm' : 'text-base'} text-gray-600 ${
                    isDesktopView ? '' : 'grid grid-cols-2 gap-4 space-y-0'
                  }`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(shipment.estimatedArrival, isDesktopView ? 'MMM d' : 'MMM d, yyyy')}</span>
                    </div>
                    <div>
                      <span className="font-medium">{totalProducts}</span> item{totalProducts !== 1 ? 's' : ''} • 
                      <span className="font-medium">{totalPounds.toFixed(0)}</span> lbs • 
                      <span className="font-medium">${totalCost.toFixed(0)}</span>
                    </div>
                    {shipment.purchaseOrderNumber && (
                      <div className="flex items-center gap-1 text-ocean-700 bg-ocean-50 px-2 py-1 rounded">
                        <FileText className="w-3 h-3" />
                        <span className="font-semibold font-mono text-sm">{shipment.purchaseOrderNumber}</span>
                      </div>
                    )}
                    {!isDesktopView && (
                      <div className="text-sm text-gray-500 col-span-2">
                        Added {format(shipment.createdAt, 'MMM d')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Product Details */}
                {isExpanded && (
                  <div className={`border-t border-gray-200 ${
                    isDesktopView ? 'px-3 pb-3' : 'px-6 pb-6'
                  }`}>
                    <div className={`space-y-2 mt-3 ${
                      isDesktopView ? '' : 'space-y-4 mt-4'
                    }`}>
                      {shipment.products.map((product) => {
                        const productInfo = state.products.find(p => p.id === product.productId);
                        
                        return (
                          <div key={product.id} className={`bg-gray-50 rounded p-3 ${
                            isDesktopView ? '' : 'rounded-lg p-4'
                          }`}>
                            <div className={`flex justify-between items-start ${
                              isDesktopView ? 'mb-2' : 'mb-3'
                            }`}>
                              <h4 className={`font-medium text-gray-900 ${
                                isDesktopView ? 'text-sm truncate' : 'text-lg'
                              }`}>
                                {product.productId === 'other' && product.customProductName 
                                  ? product.customProductName 
                                  : (productInfo?.name || 'Unknown Product')
                                }
                              </h4>
                              <div className={`text-right ${
                                isDesktopView ? 'text-sm ml-1' : 'text-lg'
                              }`}>
                                <span className="font-semibold text-ocean-600">
                                  {product.totalPounds} lbs
                                </span>
                                <div className={`text-gray-600 ${
                                  isDesktopView ? 'text-sm' : 'text-base'
                                }`}>
                                  ${product.items.reduce((sum, item) => sum + (item.pounds * (item.cost || 0)), 0).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Size Breakdown */}
                            {product.items.length > 0 && (
                              <div className={isDesktopView ? 'space-y-1' : 'space-y-2'}>
                                <h5 className={`font-medium text-gray-700 ${
                                  isDesktopView ? 'text-sm' : 'text-base'
                                }`}>Sizes:</h5>
                                <div className={`space-y-1 ${
                                  isDesktopView ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-2 space-y-0'
                                }`}>
                                  {product.items.map((item) => (
                                    <div key={item.id} className={`flex justify-between ${
                                      isDesktopView ? 'text-sm' : 'text-base'
                                    }`}>
                                      <span className="text-gray-600 truncate">{item.sizeCategory}</span>
                                      <div className="text-right ml-1">
                                        <span className="font-medium">{item.pounds} lbs</span>
                                        <span className="text-gray-500 ml-1">@ ${(item.cost || 0).toFixed(2)}/lb</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Purchase Order Section */}
                      {shipment.purchaseOrderNumber && (
                        <div className={`mt-4 p-3 bg-green-50 border border-green-200 rounded ${
                          isDesktopView ? '' : 'rounded-lg p-4'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-green-600" />
                                <span className={`font-medium text-green-800 ${
                                  isDesktopView ? 'text-sm' : 'text-base'
                                }`}>
                                  Purchase Order Number
                                </span>
                              </div>
                              <span className={`font-bold text-green-900 font-mono ${
                                isDesktopView ? 'text-lg' : 'text-xl'
                              }`}>
                                {shipment.purchaseOrderNumber}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyPONumber(shipment.purchaseOrderNumber!);
                              }}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-medium text-sm transition-colors"
                              title="Copy PO Number"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedPO === shipment.purchaseOrderNumber ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
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

export default PurchasesList;