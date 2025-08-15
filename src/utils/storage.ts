import type { AppState } from '../hooks/useAppState';
import { getWeekStart } from './dateUtils';

const STORAGE_KEY = 'seafood-purchasing-app-data';
const STORAGE_VERSION = '1.0';

// Helper to handle Date serialization
const dateReplacer = (_key: string, value: unknown) => {
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() };
  }
  return value;
};

// Helper to handle Date deserialization
const dateReviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object' && '__type' in value && value.__type === 'Date' && 'value' in value && typeof value.value === 'string') {
    return new Date(value.value);
  }
  return value;
};

interface StorageData {
  version: string;
  timestamp: string;
  state: AppState;
}

export const saveAppState = (state: AppState): void => {
  try {
    const storageData: StorageData = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      state
    };
    
    const serialized = JSON.stringify(storageData, dateReplacer);
    localStorage.setItem(STORAGE_KEY, serialized);
    
    console.log('App state saved to localStorage');
  } catch (error) {
    console.error('Failed to save app state:', error);
    // Handle localStorage quota exceeded
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please clear some data in Settings.');
    }
  }
};

export const loadAppState = (): AppState | null => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      console.log('No saved state found');
      return null;
    }
    
    console.log('Found saved data, attempting to parse...');
    const storageData: StorageData = JSON.parse(serialized, dateReviver);
    
    if (!storageData || !storageData.state) {
      console.error('Invalid storage data structure');
      return null;
    }
    
    // Validate the state has required properties
    const state = storageData.state;
    if (!Array.isArray(state.products) || !Array.isArray(state.purchases) || 
        !Array.isArray(state.shipments) || !Array.isArray(state.weeklyQuotas)) {
      console.error('Invalid state structure in saved data');
      return null;
    }

    // Ensure viewingWeekStart is a proper Date object
    if (typeof state.viewingWeekStart === 'string') {
      state.viewingWeekStart = new Date(state.viewingWeekStart);
    }
    if (!(state.viewingWeekStart instanceof Date) || isNaN(state.viewingWeekStart.getTime())) {
      console.warn('Invalid viewingWeekStart date, using current week');
      state.viewingWeekStart = getWeekStart();
    }

    // Validate and fix Date objects in purchases
    state.purchases.forEach(purchase => {
      ['purchaseDate', 'weekStartDate', 'estimatedArrival', 'createdAt'].forEach(dateField => {
        const field = dateField as keyof typeof purchase;
        if (typeof purchase[field] === 'string') {
          (purchase as unknown as Record<string, unknown>)[dateField] = new Date(purchase[field] as string);
        }
      });
    });

    // Validate and fix Date objects in shipments
    state.shipments.forEach(shipment => {
      ['purchaseDate', 'weekStartDate', 'estimatedArrival', 'createdAt', 'rejectedAt'].forEach(dateField => {
        const field = dateField as keyof typeof shipment;
        if (field === 'rejectedAt' && !shipment.rejectedAt) {
          return; // Skip if rejectedAt doesn't exist
        }
        if (typeof shipment[field] === 'string') {
          (shipment as unknown as Record<string, unknown>)[dateField] = new Date(shipment[field] as string);
        }
      });
    });

    // Validate and fix Date objects in weeklyQuotas
    state.weeklyQuotas.forEach(quota => {
      if (typeof quota.weekStartDate === 'string') {
        quota.weekStartDate = new Date(quota.weekStartDate);
      }
    });
    
    // Check version compatibility
    if (storageData.version !== STORAGE_VERSION) {
      console.warn(`Storage version mismatch. Expected ${STORAGE_VERSION}, found ${storageData.version}`);
      // For now, we'll still try to load but in future versions we might migrate
    }
    
    console.log(`Successfully loaded app state from ${storageData.timestamp}`);
    console.log(`Loaded ${state.shipments.length} shipments, ${state.purchases.length} purchases`);
    return storageData.state;
  } catch (error) {
    console.error('Failed to load app state:', error);
    console.error('Clearing corrupted data from localStorage');
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const clearAppState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('App state cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear app state:', error);
  }
};

export const getStorageInfo = () => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return {
        exists: false,
        size: 0,
        lastSaved: null
      };
    }
    
    const storageData: StorageData = JSON.parse(serialized);
    const sizeKB = Math.round((serialized.length * 2) / 1024); // Rough size in KB
    
    return {
      exists: true,
      size: sizeKB,
      lastSaved: new Date(storageData.timestamp),
      version: storageData.version
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return {
      exists: false,
      size: 0,
      lastSaved: null,
      error: true
    };
  }
};

export const exportAppData = (): string => {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) {
    throw new Error('No data to export');
  }
  return serialized;
};

export const importAppData = (data: string): boolean => {
  try {
    // Validate the data by parsing it
    const storageData: StorageData = JSON.parse(data, dateReviver);
    
    if (!storageData.state) {
      throw new Error('Invalid data format');
    }
    
    // Save the imported data
    localStorage.setItem(STORAGE_KEY, data);
    console.log('App data imported successfully');
    return true;
  } catch (error) {
    console.error('Failed to import app data:', error);
    return false;
  }
};