import React, { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Save, Trash2, Download, Upload, Database, AlertTriangle } from 'lucide-react';
import type { Product } from '../types';
import { clearAppState, getStorageInfo, exportAppData, importAppData } from '../utils/storage';

const Settings: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [products, setProducts] = useState<Product[]>(state.products);
  const [hasChanges, setHasChanges] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [storageInfo, setStorageInfo] = useState(getStorageInfo());
  
  // Update storage info when component mounts
  React.useEffect(() => {
    setStorageInfo(getStorageInfo());
  }, [state]);

  const handleProductChange = (productId: string, field: 'minQuota' | 'maxQuota', value: number) => {
    const updatedProducts = products.map(product => 
      product.id === productId 
        ? { ...product, [field]: value }
        : product
    );
    setProducts(updatedProducts);
    setHasChanges(true);
  };

  const handleSave = () => {
    products.forEach(product => {
      dispatch({ type: 'UPDATE_PRODUCT', product });
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setProducts(state.products);
    setHasChanges(false);
  };

  const handleClearAllData = () => {
    clearAppState();
    setShowClearConfirm(false);
    // Force page reload to reset state
    window.location.reload();
  };

  const handleExportData = () => {
    try {
      const data = exportAppData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seafood-app-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export data: ' + error);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        if (importAppData(data)) {
          alert('Data imported successfully! The page will reload.');
          window.location.reload();
        } else {
          alert('Failed to import data. Please check the file format.');
        }
      } catch (error) {
        alert('Failed to import data: ' + error);
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] 2xl:max-w-[80vw] mx-auto px-4 py-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-ocean-900 mb-2">
          Settings
        </h1>
        <p className="text-lg text-ocean-600">
          Configure quotas and manage your application data
        </p>
      </header>

      {/* Desktop Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Settings Column - Takes 2/3 on XL+ screens */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Quota Settings Section */}
          <div className="bg-white rounded-xl shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">
                Product Quotas
              </h2>
              <p className="text-base text-gray-600 mt-1">
                Set minimum and maximum weekly quotas for each seafood product
              </p>
            </div>
            
            <div className="p-6">
              {/* Desktop Grid - 2 columns on large screens, 3 on XL+ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                {products.map(product => (
                  <div
                    key={product.id}
                    className="bg-gray-50 rounded-lg p-5 space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Quota (lbs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={product.minQuota}
                          onChange={(e) => handleProductChange(
                            product.id, 
                            'minQuota', 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Quota (lbs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={product.maxQuota}
                          onChange={(e) => handleProductChange(
                            product.id, 
                            'maxQuota', 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {product.minQuota >= product.maxQuota && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        ⚠️ Minimum quota should be less than maximum quota
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>

        {/* Sidebar Column - Takes 1/3 on XL+ screens */}
        <div className="xl:col-span-1 space-y-6">

          {/* Data Management Section */}
          <div className="bg-white rounded-xl shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-6 h-6" />
                Data Management
              </h2>
              <p className="text-base text-gray-600 mt-1">
                Backup and manage your application data
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Storage Info */}
              <div className="bg-ocean-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-ocean-900 mb-3">Storage Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`font-medium ${storageInfo.exists ? 'text-green-600' : 'text-gray-500'}`}>
                      {storageInfo.exists ? '✓ Data saved' : 'No saved data'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Size:</span>
                    <span className="text-gray-600">{storageInfo.size} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Last Saved:</span>
                    <span className="text-gray-600 text-right">
                      {storageInfo.lastSaved 
                        ? storageInfo.lastSaved.toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Actions */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Data Actions</h3>
                
                {/* Export Data */}
                <button
                  onClick={handleExportData}
                  disabled={!storageInfo.exists}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>

                {/* Import Data */}
                <label className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>

                {/* Clear All Data */}
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={!storageInfo.exists}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Save Changes Bar - Fixed at bottom on desktop */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg xl:relative xl:bottom-auto xl:left-auto xl:right-auto xl:border-t-0 xl:shadow-none xl:bg-transparent xl:mt-6">
          <div className="max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] 2xl:max-w-[80vw] mx-auto px-4 py-4 xl:px-0">
            <div className="bg-white rounded-xl shadow-md p-6 xl:shadow-md">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Reset Changes
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 px-4 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-semibold text-gray-900">Clear All Data</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will permanently delete all your shipments, purchases, and quota settings. 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllData}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;