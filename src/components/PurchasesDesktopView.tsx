import React, { useState } from 'react';
import CalendarView from './CalendarView';
import PurchasesList from './PurchasesList';
import ProductAnalyticsChart from './ProductAnalyticsChart';
import type { Shipment } from '../types';
import type { DateRange } from '../utils/analytics';
import { 
  getShipmentsInDateRange, 
  aggregateProductData, 
  getDateRangeSummary, 
  formatDateRange 
} from '../utils/analytics';
import { useAppState } from '../hooks/useAppState';

interface PurchasesDesktopViewProps {
  onEditShipment: (shipment: Shipment) => void;
}

const PurchasesDesktopView: React.FC<PurchasesDesktopViewProps> = ({ onEditShipment }) => {
  const { state } = useAppState();
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
  
  // Calculate analytics data
  const rangeShipments = selectedDateRange 
    ? getShipmentsInDateRange(state.shipments, selectedDateRange)
    : [];
  const analyticsData = aggregateProductData(rangeShipments, state.products);
  const summary = selectedDateRange 
    ? getDateRangeSummary(state.shipments, selectedDateRange)
    : null;

  return (
    <div className="max-w-[95vw] lg:max-w-[85vw] xl:max-w-[80vw] mx-auto px-4 py-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-ocean-900">
          Purchase History
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          {selectedDateRange 
            ? `Viewing ${summary?.totalShipments || 0} shipments for ${formatDateRange(selectedDateRange)}` 
            : 'Select one or more dates to view shipments'
          }
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar Column - 75% width (3 out of 4 columns) */}
        <div className="lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
          {/* Analytics Chart */}
          <ProductAnalyticsChart 
            data={analyticsData}
            dateRange={selectedDateRange}
            totalShipments={summary?.totalShipments || 0}
            totalPounds={summary?.totalPounds || 0}
            totalCost={summary?.totalCost || 0}
          />
          
          {/* Calendar */}
          <CalendarView 
            selectedDateRange={selectedDateRange}
            onDateRangeSelect={setSelectedDateRange}
          />
        </div>
        
        {/* Purchases List Column - 25% width (1 out of 4 columns) */}
        <div className="lg:col-span-1 space-y-4">
          {selectedDateRange ? (
            <PurchasesList 
              onEditShipment={onEditShipment}
              selectedDateRange={selectedDateRange}
              isDesktopView={true}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
                <h3 className="text-xl font-medium mb-2">Select Dates</h3>
                <p className="text-base">Click on a date or drag to select multiple dates to view shipments</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchasesDesktopView;