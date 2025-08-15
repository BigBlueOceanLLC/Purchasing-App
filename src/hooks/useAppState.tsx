import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product, Purchase, Shipment, WeeklyQuota, QuotaStatus } from '../types';
import { SEAFOOD_PRODUCTS } from '../data/products';
import { getWeekStart, getWeekKey } from '../utils/dateUtils';
import { loadAppState, saveAppState } from '../utils/storage';

export interface AppState {
  products: Product[];
  purchases: Purchase[];
  shipments: Shipment[];
  weeklyQuotas: WeeklyQuota[];
  viewingWeekStart: Date;
}

type AppAction =
  | { type: 'ADD_PURCHASE'; purchase: Purchase }
  | { type: 'ADD_SHIPMENT'; shipment: Shipment }
  | { type: 'EDIT_SHIPMENT'; shipment: Shipment }
  | { type: 'DELETE_SHIPMENT'; shipmentId: string }
  | { type: 'REJECT_SHIPMENT'; shipmentId: string }
  | { type: 'UNREJECT_SHIPMENT'; shipmentId: string }
  | { type: 'DELETE_OLD_REJECTED' }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'SET_WEEKLY_QUOTA'; quota: WeeklyQuota }
  | { type: 'SET_VIEWING_WEEK'; weekStart: Date }
  | { type: 'NAVIGATE_WEEK'; direction: 'prev' | 'next' };

const initialState: AppState = {
  products: SEAFOOD_PRODUCTS,
  purchases: [],
  shipments: [],
  weeklyQuotas: [],
  viewingWeekStart: getWeekStart(),
};

const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  getQuotaStatus: (productId: string, weekStart?: Date) => QuotaStatus;
} | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_PURCHASE':
      return {
        ...state,
        purchases: [...state.purchases, action.purchase],
      };
    case 'ADD_SHIPMENT': {
      // Convert shipment to individual purchases for quota calculations (only if not rejected)
      const shipmentPurchases: Purchase[] = action.shipment.approvalStatus !== 'rejected' 
        ? action.shipment.products.map(product => ({
        id: `${action.shipment.id}_${product.id}`,
        productId: product.productId,
        totalPounds: product.totalPounds,
        purchaseDate: action.shipment.purchaseDate,
        weekStartDate: action.shipment.weekStartDate,
        shipper: action.shipment.shipper,
        estimatedArrival: action.shipment.estimatedArrival,
        items: product.items,
        createdAt: action.shipment.createdAt,
        shipmentId: action.shipment.id,
      }))
      : [];
      return {
        ...state,
        shipments: [...state.shipments, action.shipment],
        purchases: [...state.purchases, ...shipmentPurchases],
      };
    }
    case 'EDIT_SHIPMENT': {
      // Remove old purchases for this shipment and add new ones (only if not rejected)
      const filteredPurchases = state.purchases.filter(p => p.shipmentId !== action.shipment.id);
      const editedShipmentPurchases: Purchase[] = action.shipment.approvalStatus !== 'rejected'
        ? action.shipment.products.map(product => ({
        id: `${action.shipment.id}_${product.id}`,
        productId: product.productId,
        totalPounds: product.totalPounds,
        purchaseDate: action.shipment.purchaseDate,
        weekStartDate: action.shipment.weekStartDate,
        shipper: action.shipment.shipper,
        estimatedArrival: action.shipment.estimatedArrival,
        items: product.items,
        createdAt: action.shipment.createdAt,
        shipmentId: action.shipment.id,
      }))
      : [];
      return {
        ...state,
        shipments: state.shipments.map(s => s.id === action.shipment.id ? action.shipment : s),
        purchases: [...filteredPurchases, ...editedShipmentPurchases],
      };
    }
    case 'DELETE_SHIPMENT':
      // Remove shipment and all associated purchases
      return {
        ...state,
        shipments: state.shipments.filter(s => s.id !== action.shipmentId),
        purchases: state.purchases.filter(p => p.shipmentId !== action.shipmentId),
      };
    case 'REJECT_SHIPMENT': {
      // Mark shipment as rejected and remove from purchases
      const rejectedShipment = state.shipments.find(s => s.id === action.shipmentId);
      if (!rejectedShipment) return state;
      
      const updatedShipment = {
        ...rejectedShipment,
        approvalStatus: 'rejected' as const,
        rejectedAt: new Date(),
      };
      
      return {
        ...state,
        shipments: state.shipments.map(s => s.id === action.shipmentId ? updatedShipment : s),
        purchases: state.purchases.filter(p => p.shipmentId !== action.shipmentId),
      };
    }
    case 'UNREJECT_SHIPMENT': {
      // Restore shipment to pending status
      const rejectedShipment = state.shipments.find(s => s.id === action.shipmentId);
      if (!rejectedShipment || rejectedShipment.approvalStatus !== 'rejected') return state;
      
      const restoredShipment = {
        ...rejectedShipment,
        approvalStatus: 'pending' as const,
        rejectedAt: undefined,
      };
      
      return {
        ...state,
        shipments: state.shipments.map(s => s.id === action.shipmentId ? restoredShipment : s),
      };
    }
    case 'DELETE_OLD_REJECTED': {
      // Delete rejected shipments older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      return {
        ...state,
        shipments: state.shipments.filter(s => {
          if (s.approvalStatus !== 'rejected') return true;
          if (!s.rejectedAt) return true;
          return s.rejectedAt > thirtyDaysAgo;
        }),
      };
    }
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => 
          p.id === action.product.id ? action.product : p
        ),
      };
    case 'SET_WEEKLY_QUOTA':
      return {
        ...state,
        weeklyQuotas: state.weeklyQuotas.some(q => 
          q.productId === action.quota.productId && 
          q.weekStartDate.getTime() === action.quota.weekStartDate.getTime()
        )
          ? state.weeklyQuotas.map(q => 
              q.productId === action.quota.productId && 
              q.weekStartDate.getTime() === action.quota.weekStartDate.getTime() 
                ? action.quota 
                : q
            )
          : [...state.weeklyQuotas, action.quota],
      };
    case 'SET_VIEWING_WEEK':
      return {
        ...state,
        viewingWeekStart: action.weekStart,
      };
    case 'NAVIGATE_WEEK': {
      const currentWeek = state.viewingWeekStart;
      const newWeek = new Date(currentWeek);
      newWeek.setDate(newWeek.getDate() + (action.direction === 'next' ? 7 : -7));
      return {
        ...state,
        viewingWeekStart: getWeekStart(newWeek),
      };
    }
    default:
      return state;
  }
}

// Create a custom initializer function that loads from localStorage
function initializeState(): AppState {
  try {
    console.log('Initializing app state...');
    const savedState = loadAppState();
    if (savedState) {
      console.log('Using saved state');
      // Merge saved state with current products to handle any product updates
      // Preserve saved quota settings while adding any new products from code
      const mergedProducts = SEAFOOD_PRODUCTS.map(defaultProduct => {
        const savedProduct = savedState.products?.find(p => p.id === defaultProduct.id);
        return savedProduct || defaultProduct; // Use saved quotas if available, otherwise default
      });
      
      // Handle backward compatibility for shipments without approval fields
      const migratedShipments = savedState.shipments?.map(shipment => ({
        ...shipment,
        approvalStatus: shipment.approvalStatus || 'approved', // Default existing shipments to approved
        purchaseOrderNumber: shipment.purchaseOrderNumber || undefined,
      })) || [];
      
      const mergedState = {
        ...savedState,
        products: mergedProducts,
        shipments: migratedShipments,
        viewingWeekStart: savedState.viewingWeekStart || getWeekStart(), // Ensure we have a valid date
      };
      console.log('Merged state created successfully');
      return mergedState;
    }
    console.log('Using initial state');
    return initialState;
  } catch (error) {
    console.error('Error during state initialization:', error);
    console.log('Falling back to initial state');
    return initialState;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initializeState());

  // Save state to localStorage whenever it changes (but not on initial load)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }
    
    try {
      saveAppState(state);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [state, isInitialized]);

  const getQuotaStatus = (productId: string, weekStart: Date = state.viewingWeekStart): QuotaStatus => {
    const product = state.products.find(p => p.id === productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const weekKey = getWeekKey(weekStart);
    const currentTotal = state.purchases
      .filter(p => 
        p.productId === productId && 
        getWeekKey(p.estimatedArrival) === weekKey
      )
      .reduce((sum, purchase) => sum + purchase.totalPounds, 0);

    const percentage = product.maxQuota > 0 ? (currentTotal / product.maxQuota) * 100 : 0;
    
    let status: 'under' | 'good' | 'near-max' | 'over';
    if (currentTotal > product.maxQuota) {
      status = 'over';
    } else if (percentage >= 90) {
      status = 'near-max';
    } else if (currentTotal >= product.minQuota) {
      status = 'good';
    } else {
      status = 'under';
    }

    return {
      product,
      currentTotal,
      minQuota: product.minQuota,
      maxQuota: product.maxQuota,
      percentage,
      status,
    };
  };

  return (
    <AppStateContext.Provider value={{ state, dispatch, getQuotaStatus }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}