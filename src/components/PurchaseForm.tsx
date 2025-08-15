import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { getWeekStart, parseDateInput, formatDateForInput } from '../utils/dateUtils';
import { PRODUCT_SIZE_CATEGORIES, COMMON_SIZE_CATEGORIES } from '../data/products';
import { generatePurchaseOrderNumber } from '../utils/purchaseOrderUtils';
import ShipmentConfirmation from './ShipmentConfirmation';
import { X, Plus, Minus } from 'lucide-react';
import { api } from '../utils/api';
import type { PurchaseItem, Shipment } from '../types';

interface PurchaseFormProps {
  onClose: () => void;
  editingShipment?: Shipment;
}

interface ProductFormData {
  productId: string;
  customProductName?: string;
  totalPounds: number;
  items: Omit<PurchaseItem, 'id'>[];
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ onClose, editingShipment }) => {
  const { state, dispatch, getQuotaStatus } = useAppState();
  const { user, token } = useAuth();
  const isEditing = !!editingShipment;
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedShipment, setSubmittedShipment] = useState<Shipment | null>(null);
  
  const [shipper, setShipper] = useState<string>(
    editingShipment?.shipper || ''
  );
  const [estimatedArrival, setEstimatedArrival] = useState<string>(
    editingShipment?.estimatedArrival ? formatDateForInput(editingShipment.estimatedArrival) : formatDateForInput(new Date())
  );
  const [products, setProducts] = useState<ProductFormData[]>(
    editingShipment?.products.map(product => ({
      productId: product.productId,
      customProductName: product.customProductName || '',
      totalPounds: product.totalPounds,
      items: product.items
    })) || [{
      productId: '',
      customProductName: '',
      totalPounds: 0,
      items: [{ sizeCategory: '', pounds: 0, cost: 0, notes: '' }]
    }]
  );

  const handleAddProduct = () => {
    setProducts([...products, {
      productId: '',
      customProductName: '',
      totalPounds: 0,
      items: [{ sizeCategory: '', pounds: 0, cost: 0, notes: '' }]
    }]);
  };

  const handleRemoveProduct = (productIndex: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== productIndex));
    }
  };

  const handleProductChange = (productIndex: number, field: 'productId' | 'totalPounds' | 'customProductName', value: string | number) => {
    const newProducts = [...products];
    if (field === 'productId') {
      // Reset items when product changes
      const isOther = value === 'other';
      const newSizeCategories = value && !isOther ? PRODUCT_SIZE_CATEGORIES[value as string] || COMMON_SIZE_CATEGORIES : COMMON_SIZE_CATEGORIES;
      newProducts[productIndex] = {
        ...newProducts[productIndex],
        productId: value as string,
        customProductName: isOther ? newProducts[productIndex].customProductName : '',
        items: [{ sizeCategory: isOther ? '' : newSizeCategories[0], pounds: 0, cost: 0, notes: '' }]
      };
    } else {
      newProducts[productIndex] = { ...newProducts[productIndex], [field]: field === 'customProductName' ? value as string : value as number };
    }
    setProducts(newProducts);
  };

  const handleAddItem = (productIndex: number) => {
    const product = products[productIndex];
    const isOther = product.productId === 'other';
    const sizeCategories = product.productId && !isOther ? PRODUCT_SIZE_CATEGORIES[product.productId] || COMMON_SIZE_CATEGORIES : COMMON_SIZE_CATEGORIES;
    const newProducts = [...products];
    newProducts[productIndex].items = [...product.items, { sizeCategory: isOther ? '' : sizeCategories[0], pounds: 0, cost: 0, notes: '' }];
    setProducts(newProducts);
  };

  const handleRemoveItem = (productIndex: number, itemIndex: number) => {
    const newProducts = [...products];
    if (newProducts[productIndex].items.length > 1) {
      newProducts[productIndex].items = newProducts[productIndex].items.filter((_, i) => i !== itemIndex);
      setProducts(newProducts);
    }
  };

  const handleItemChange = (productIndex: number, itemIndex: number, field: keyof Omit<PurchaseItem, 'id'>, value: string | number) => {
    const newProducts = [...products];
    newProducts[productIndex].items[itemIndex] = { ...newProducts[productIndex].items[itemIndex], [field]: value };
    setProducts(newProducts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shipper.trim() || !estimatedArrival) {
      alert('Please enter shipper and estimated arrival date');
      return;
    }

    // Validate all products
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product.productId || product.totalPounds <= 0) {
        alert(`Please complete Product ${i + 1} details`);
        return;
      }
      
      if (product.productId === 'other' && !product.customProductName?.trim()) {
        alert(`Please enter a name for Product ${i + 1} (Other)`);
        return;
      }
      
      const itemsTotal = product.items.reduce((sum, item) => sum + item.pounds, 0);
      if (Math.abs(itemsTotal - product.totalPounds) > 0.01) {
        alert(`Product ${i + 1}: Size breakdown must equal total pounds`);
        return;
      }

    }

    // Determine approval status based on quota calculations
    const estimatedArrivalDate = parseDateInput(estimatedArrival);
    const weekStart = getWeekStart(estimatedArrivalDate);
    
    let requiresApproval = false;
    
    // Check each product's quota impact
    for (const product of products) {
      if (product.productId === 'other') continue; // Skip "Other" products for quota checks
      
      const currentQuotaStatus = getQuotaStatus(product.productId, weekStart);
      
      // If already near-max or over, requires approval
      if (currentQuotaStatus.status === 'near-max' || currentQuotaStatus.status === 'over') {
        requiresApproval = true;
        break;
      }
      
      // Check if adding this product would push quota over limit
      const newTotal = currentQuotaStatus.currentTotal + product.totalPounds;
      if (newTotal > currentQuotaStatus.maxQuota) {
        requiresApproval = true;
        break;
      }
    }
    
    // Generate PO number only for approved shipments
    const existingPONumbers = state.shipments
      .filter(s => s.approvalStatus === 'approved' && s.purchaseOrderNumber)
      .map(s => s.purchaseOrderNumber!);
    
    const approvalStatus: 'approved' | 'pending' = requiresApproval ? 'pending' : 'approved';
    const purchaseOrderNumber = approvalStatus === 'approved' 
      ? generatePurchaseOrderNumber(existingPONumbers)
      : undefined;

    const shipmentId = editingShipment?.id || Date.now().toString();
    const shipment = {
      id: shipmentId,
      shipper: shipper.trim(),
      estimatedArrival: estimatedArrivalDate,
      purchaseDate: editingShipment?.purchaseDate || new Date(),
      weekStartDate: weekStart,
      products: products.map((product, productIndex) => ({
        id: `${shipmentId}_${productIndex}`,
        productId: product.productId,
        customProductName: product.productId === 'other' ? product.customProductName : undefined,
        totalPounds: product.totalPounds,
        items: product.items.map((item, itemIndex) => ({
          ...item,
          id: `${shipmentId}_${productIndex}_${itemIndex}`
        }))
      })),
      createdAt: editingShipment?.createdAt || new Date(),
      approvalStatus,
      purchaseOrderNumber,
      purchaserId: editingShipment?.purchaserId || user?.id,
    };

    if (isEditing) {
      dispatch({ type: 'EDIT_SHIPMENT', shipment });
      onClose(); // For edits, just close normally
    } else {
      dispatch({ type: 'ADD_SHIPMENT', shipment });
      setSubmittedShipment(shipment);
      setShowConfirmation(true);

      // Send Slack notifications for new shipments
      if (token && user?.id) {
        try {
          const shipmentData = {
            ...shipment,
            products: shipment.products.map(p => ({
              ...p,
              productName: state.products.find(prod => prod.id === p.productId)?.name || p.customProductName || 'Unknown Product'
            }))
          };

          if (approvalStatus === 'approved') {
            // Send auto-approved notification
            await api.slack.sendNewShipmentAutoApprovedNotification(token, shipmentData, user.id);
            console.log('✅ Auto-approved shipment Slack notification sent');
          } else {
            // Send pending approval notification - include shipmentId for interactive buttons
            const pendingShipmentData = {
              ...shipmentData,
              shipmentId: shipment.id
            };
            await api.slack.sendNewShipmentPendingNotification(token, pendingShipmentData, user.id);
            console.log('✅ Pending shipment Slack notification sent');
          }
        } catch (notificationError) {
          console.warn('⚠️ Slack notification failed:', notificationError);
          // Don't fail the shipment creation if notifications fail
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex justify-between items-center rounded-t-3xl sm:rounded-t-xl">
          <h2 className="text-2xl sm:text-2xl font-semibold text-gray-900">
            {isEditing ? 'Edit Shipment' : 'New Shipment'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2"
          >
            <X className="w-7 h-7 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Shared Shipment Fields */}
          <div className="bg-ocean-50 p-5 rounded-xl space-y-6">
            <h3 className="text-xl font-semibold text-ocean-900">Shipment Details</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Shipper
                </label>
                <input
                  type="text"
                  value={shipper}
                  onChange={(e) => setShipper(e.target.value)}
                  placeholder="Enter shipper name"
                  className="w-full p-4 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Estimated Arrival Date
                </label>
                <input
                  type="date"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="w-full p-4 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Products</h3>
              <button
                type="button"
                onClick={handleAddProduct}
                className="text-ocean-600 hover:text-ocean-700 flex items-center text-lg font-medium px-3 py-2 rounded-lg hover:bg-ocean-50 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Product
              </button>
            </div>

            <div className="space-y-6">
              {products.map((product, productIndex) => {
                const isOther = product.productId === 'other';
                const availableSizeCategories = product.productId && !isOther ? PRODUCT_SIZE_CATEGORIES[product.productId] || COMMON_SIZE_CATEGORIES : COMMON_SIZE_CATEGORIES;
                const itemsTotal = product.items.reduce((sum, item) => sum + item.pounds, 0);
                const itemsCostTotal = product.items.reduce((sum, item) => sum + (item.pounds * (item.cost || 0)), 0);
                
                return (
                  <div key={productIndex} className="border border-gray-200 rounded-xl p-5 space-y-6 bg-white shadow-sm">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xl font-semibold text-gray-800">Product {productIndex + 1}</h4>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(productIndex)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-lg font-medium text-gray-700 mb-3">
                          Product Type
                        </label>
                        <select
                          value={product.productId}
                          onChange={(e) => handleProductChange(productIndex, 'productId', e.target.value)}
                          className="w-full p-4 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent appearance-none bg-white"
                          required
                        >
                          <option value="">Select product</option>
                          {state.products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {isOther && (
                        <div>
                          <label className="block text-lg font-medium text-gray-700 mb-3">
                            Product Name
                          </label>
                          <input
                            type="text"
                            value={product.customProductName || ''}
                            onChange={(e) => handleProductChange(productIndex, 'customProductName', e.target.value)}
                            placeholder="Enter product name"
                            className="w-full p-4 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                            required
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-lg font-medium text-gray-700 mb-3">
                          Total Pounds
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.totalPounds}
                          onChange={(e) => handleProductChange(productIndex, 'totalPounds', parseFloat(e.target.value) || 0)}
                          className="w-full p-4 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    {/* Size Breakdown for this product */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-lg font-medium text-gray-700">
                          Size Breakdown
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddItem(productIndex)}
                          className="text-ocean-600 hover:text-ocean-700 flex items-center text-lg font-medium px-3 py-2 rounded-lg hover:bg-ocean-50 transition-colors"
                        >
                          <Plus className="w-5 h-5 mr-1" />
                          Add Size
                        </button>
                      </div>

                      <div className="space-y-4">
                        {product.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="bg-gray-50 p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-base font-medium text-gray-600">Size {itemIndex + 1}</span>
                              {product.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(productIndex, itemIndex)}
                                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <Minus className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-base font-medium text-gray-700 mb-2">
                                  {isOther ? 'Size/Category Description' : 'Size Category'}
                                </label>
                                {isOther ? (
                                  <input
                                    type="text"
                                    value={item.sizeCategory}
                                    onChange={(e) => handleItemChange(productIndex, itemIndex, 'sizeCategory', e.target.value)}
                                    placeholder="Enter size or category"
                                    className="w-full p-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                                  />
                                ) : (
                                  <select
                                    value={item.sizeCategory}
                                    onChange={(e) => handleItemChange(productIndex, itemIndex, 'sizeCategory', e.target.value)}
                                    className="w-full p-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent appearance-none bg-white"
                                  >
                                    <option value="">Select size</option>
                                    {availableSizeCategories.map(category => (
                                      <option key={category} value={category}>
                                        {category}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-base font-medium text-gray-700 mb-2">Pounds</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.pounds}
                                  onChange={(e) => handleItemChange(productIndex, itemIndex, 'pounds', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-full p-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-base font-medium text-gray-700 mb-2">Price per lb</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.cost}
                                  onChange={(e) => handleItemChange(productIndex, itemIndex, 'cost', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-full p-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 p-4 bg-ocean-50 rounded-xl space-y-2">
                        <div className="text-lg font-medium text-gray-700">
                          Items total: {itemsTotal.toFixed(2)} lbs
                          {Math.abs(itemsTotal - product.totalPounds) > 0.01 && (
                            <span className="text-red-500 ml-2 text-base">
                              (Doesn't match total: {product.totalPounds.toFixed(2)} lbs)
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-medium text-ocean-700">
                          Total cost: ${itemsCostTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-4 px-6 text-xl border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 py-4 px-6 text-xl bg-ocean-600 text-white rounded-xl hover:bg-ocean-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isEditing ? 'Update Shipment' : 'Add Shipment'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmation && submittedShipment && (
        <ShipmentConfirmation 
          shipment={submittedShipment}
          onClose={onClose}
        />
      )}
    </div>
  );
};

export default PurchaseForm;