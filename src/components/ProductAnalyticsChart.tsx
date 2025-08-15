import React from 'react';
import type { ProductAnalytics, DateRange } from '../utils/analytics';
import { formatDateRange } from '../utils/analytics';
import { BarChart3, TrendingUp } from 'lucide-react';

interface ProductAnalyticsChartProps {
  data: ProductAnalytics[];
  dateRange: DateRange | null;
  totalShipments: number;
  totalPounds: number;
  totalCost: number;
}

const ProductAnalyticsChart: React.FC<ProductAnalyticsChartProps> = ({
  data,
  dateRange,
  totalShipments,
  totalPounds,
  totalCost
}) => {
  // Calculate max value for chart scaling
  const maxPounds = Math.max(...data.map(d => d.totalPounds), 1);
  
  if (!dateRange) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-medium mb-2">Product Analytics</h3>
          <p>Select one or more dates to view product distribution</p>
        </div>
      </div>
    );
  }

  const hasData = data.some(d => d.totalPounds > 0);
  
  if (!hasData) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-medium mb-2">No Shipments</h3>
          <p>No shipments found for {formatDateRange(dateRange)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-ocean-600" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Product Distribution</h2>
            <p className="text-base text-gray-600">{formatDateRange(dateRange)}</p>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-ocean-600">{totalShipments}</div>
            <div className="text-gray-500">Shipments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-ocean-600">{totalPounds.toFixed(0)}</div>
            <div className="text-gray-500">Total lbs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-ocean-600">${totalCost.toFixed(0)}</div>
            <div className="text-gray-500">Total cost</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {data
          .filter(product => product.totalPounds > 0)
          .map((product) => {
            const percentage = (product.totalPounds / maxPounds) * 100;
            
            return (
              <div key={product.productId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{product.productName}</span>
                  <div className="text-right text-sm text-gray-600">
                    <div>{product.totalPounds.toFixed(0)} lbs • ${product.totalCost.toFixed(0)}</div>
                    <div className="text-xs text-gray-500">
                      {product.shipmentCount} shipment{product.shipmentCount !== 1 ? 's' : ''} • 
                      ${(product.totalCost / product.totalPounds || 0).toFixed(2)}/lb avg
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                      style={{
                        width: `${Math.max(percentage, 3)}%`, // Minimum 3% width for visibility
                        backgroundColor: product.color
                      }}
                    >
                      {percentage >= 15 && ( // Only show text if bar is wide enough
                        <span className="text-white text-xs font-medium">
                          {product.totalPounds.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Chart Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Products with shipments only</span>
          <span>Sorted by total pounds</span>
        </div>
      </div>
    </div>
  );
};

export default ProductAnalyticsChart;