import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { formatWeekRange, getWeekStart } from '../utils/dateUtils';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import PurchaseForm from './PurchaseForm';

const Dashboard: React.FC = () => {
  const { state, dispatch, getQuotaStatus } = useAppState();
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const viewingWeek = state.viewingWeekStart;
  const weekRange = formatWeekRange(viewingWeek);
  const isCurrentWeek = getWeekStart().getTime() === viewingWeek.getTime();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over':
        return 'bg-red-500';
      case 'near-max':
        return 'bg-yellow-500';
      case 'good':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'over':
        return 'Over Quota';
      case 'near-max':
        return 'Near Maximum';
      case 'good':
        return 'On Track';
      default:
        return 'Under Minimum';
    }
  };

  return (
    <div className="max-w-[95vw] lg:max-w-[85vw] xl:max-w-[80vw] mx-auto px-4 py-6">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-ocean-900 mb-2">
                Seafood Purchasing Dashboard
              </h1>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => dispatch({ type: 'NAVIGATE_WEEK', direction: 'prev' })}
                  className="text-ocean-600 hover:text-ocean-800 p-1 transition-colors"
                  title="Previous week"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <p className="text-ocean-600 font-medium">
                  Week of {weekRange}
                  {isCurrentWeek && <span className="text-ocean-800 ml-2">(Current)</span>}
                </p>
                <button
                  onClick={() => dispatch({ type: 'NAVIGATE_WEEK', direction: 'next' })}
                  className="text-ocean-600 hover:text-ocean-800 p-1 transition-colors"
                  title="Next week"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
          {state.products.map(product => {
            const quotaStatus = getQuotaStatus(product.id, viewingWeek);
            
            return (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product.name}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(quotaStatus.status)}`}>
                    {getStatusText(quotaStatus.status)}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{quotaStatus.currentTotal.toFixed(1)} lbs</span>
                    <span>{quotaStatus.maxQuota} lbs</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(quotaStatus.status)}`}
                      style={{
                        width: `${Math.min(quotaStatus.percentage, 100)}%`,
                      }}
                    />
                  </div>
                  {quotaStatus.percentage > 100 && (
                    <div className="text-xs text-red-600 mt-1">
                      {(quotaStatus.percentage - 100).toFixed(1)}% over limit
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Min: {quotaStatus.minQuota} lbs</span>
                    <span>Max: {quotaStatus.maxQuota} lbs</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => setShowPurchaseForm(true)}
          className="fixed bottom-24 right-6 bg-ocean-600 hover:bg-ocean-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40"
        >
          <Plus className="w-6 h-6" />
        </button>

        {showPurchaseForm && (
          <PurchaseForm onClose={() => setShowPurchaseForm(false)} />
        )}
      </div>
  );
};

export default Dashboard;