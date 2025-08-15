import { useState, useEffect } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { AppStateProvider } from './hooks/useAppState';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import PurchasesList from './components/PurchasesList';
import PurchasesDesktopView from './components/PurchasesDesktopView';
import PendingPurchases from './components/PendingPurchases';
import PurchaseForm from './components/PurchaseForm';
import BackendStatus from './components/BackendStatus';
import { BarChart3, ShoppingCart, Settings as SettingsIcon, Clock } from 'lucide-react';
import type { Shipment } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchases' | 'pending' | 'settings'>('dashboard');
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleEditShipment = (shipment: Shipment) => {
    setEditingShipment(shipment);
  };

  const handleCloseEdit = () => {
    setEditingShipment(null);
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'purchases' as const, label: 'Purchases', icon: ShoppingCart },
    { id: 'pending' as const, label: 'Pending', icon: Clock },
    { id: 'settings' as const, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppStateProvider>
          <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-ocean-100 pb-24">
            {/* Main Content */}
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'purchases' && (
              isDesktop ? (
                <PurchasesDesktopView onEditShipment={handleEditShipment} />
              ) : (
                <PurchasesList onEditShipment={handleEditShipment} />
              )
            )}
            {activeTab === 'pending' && <PendingPurchases onEditShipment={handleEditShipment} />}
            {activeTab === 'settings' && <Settings />}

            {/* Edit Modal */}
            {editingShipment && (
              <PurchaseForm 
                editingShipment={editingShipment}
                onClose={handleCloseEdit}
              />
            )}

            {/* Backend Status Indicator */}
            <BackendStatus />

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 pb-safe z-50" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
              <div className="flex justify-around items-center max-w-lg mx-auto">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                        isActive 
                          ? 'text-ocean-600 bg-ocean-50' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </AppStateProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
