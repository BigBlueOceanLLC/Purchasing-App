import { isSameDay, isAfter, isBefore, isEqual } from 'date-fns';
import type { Shipment, Product } from '../types';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ProductAnalytics {
  productId: string;
  productName: string;
  totalPounds: number;
  totalCost: number;
  shipmentCount: number;
  color: string;
}

// Product color mapping for consistent chart colors
export const PRODUCT_COLORS: Record<string, string> = {
  tuna: '#ef4444', // red-500
  sword: '#f97316', // orange-500
  mahi: '#eab308', // yellow-500
  wahoo: '#22c55e', // green-500
  grouper: '#06b6d4', // cyan-500
  snapper: '#3b82f6', // blue-500
  salmon: '#8b5cf6', // violet-500
  seabass: '#ec4899', // pink-500
};

/**
 * Check if a date falls within a date range (inclusive)
 */
export const isDateInRange = (date: Date, range: DateRange): boolean => {
  return (isSameDay(date, range.start) || isAfter(date, range.start)) && 
         (isSameDay(date, range.end) || isBefore(date, range.end));
};

/**
 * Get all shipments within a date range based on estimated arrival
 */
export const getShipmentsInDateRange = (shipments: Shipment[], range: DateRange): Shipment[] => {
  return shipments.filter(shipment => 
    isDateInRange(shipment.estimatedArrival, range)
  );
};

/**
 * Aggregate shipment data by product for analytics
 */
export const aggregateProductData = (
  shipments: Shipment[], 
  products: Product[]
): ProductAnalytics[] => {
  const productMap = new Map<string, ProductAnalytics>();
  
  // Initialize all products with zero values
  products.forEach(product => {
    if (product.id !== 'other') { // Don't pre-initialize 'other' since it has dynamic names
      productMap.set(product.id, {
        productId: product.id,
        productName: product.name,
        totalPounds: 0,
        totalCost: 0,
        shipmentCount: 0,
        color: PRODUCT_COLORS[product.id] || '#6b7280', // Default gray
      });
    }
  });
  
  // Aggregate data from shipments
  shipments.forEach(shipment => {
    shipment.products.forEach(productPurchase => {
      const key = productPurchase.productId === 'other' && productPurchase.customProductName 
        ? `other_${productPurchase.customProductName}` 
        : productPurchase.productId;
        
      let existing = productMap.get(key);
      if (!existing) {
        // Create new entry for 'other' products or missing products
        const productName = productPurchase.productId === 'other' && productPurchase.customProductName
          ? productPurchase.customProductName
          : products.find(p => p.id === productPurchase.productId)?.name || 'Unknown Product';
          
        existing = {
          productId: key,
          productName,
          totalPounds: 0,
          totalCost: 0,
          shipmentCount: 0,
          color: PRODUCT_COLORS[productPurchase.productId] || '#6b7280',
        };
        productMap.set(key, existing);
      }
      
      existing.totalPounds += productPurchase.totalPounds;
      existing.totalCost += productPurchase.items.reduce((sum, item) => sum + (item.pounds * (item.cost || 0)), 0);
      existing.shipmentCount += 1;
    });
  });
  
  // Return sorted by total pounds (descending)
  return Array.from(productMap.values())
    .sort((a, b) => b.totalPounds - a.totalPounds);
};

/**
 * Format date range for display
 */
export const formatDateRange = (range: DateRange): string => {
  if (isSameDay(range.start, range.end)) {
    return range.start.toLocaleDateString();
  }
  
  const startStr = range.start.toLocaleDateString();
  const endStr = range.end.toLocaleDateString();
  const dayCount = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  return `${startStr} - ${endStr} (${dayCount} day${dayCount !== 1 ? 's' : ''})`;
};

/**
 * Create a date range from two dates (handles order automatically)
 */
export const createDateRange = (date1: Date, date2: Date): DateRange => {
  if (isBefore(date1, date2) || isEqual(date1, date2)) {
    return { start: date1, end: date2 };
  } else {
    return { start: date2, end: date1 };
  }
};

/**
 * Get summary statistics for a date range
 */
export const getDateRangeSummary = (
  shipments: Shipment[], 
  range: DateRange
) => {
  const rangeShipments = getShipmentsInDateRange(shipments, range);
  const totalPounds = rangeShipments.reduce((sum, shipment) => 
    sum + shipment.products.reduce((shipSum, product) => 
      shipSum + product.totalPounds, 0), 0
  );
  
  const totalCost = rangeShipments.reduce((sum, shipment) => 
    sum + shipment.products.reduce((shipSum, product) => 
      shipSum + product.items.reduce((itemSum, item) => itemSum + (item.pounds * (item.cost || 0)), 0), 0), 0
  );
  
  return {
    totalShipments: rangeShipments.length,
    totalPounds,
    totalCost,
    uniqueShippers: new Set(rangeShipments.map(s => s.shipper)).size,
    dateRange: formatDateRange(range),
  };
};