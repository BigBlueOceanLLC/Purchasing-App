export interface Product {
  id: string;
  name: string;
  minQuota: number;
  maxQuota: number;
}

export interface PurchaseItem {
  id: string;
  sizeCategory: string;
  pounds: number;
  cost: number;
  notes?: string;
}

export interface ProductPurchase {
  id: string;
  productId: string;
  customProductName?: string;
  totalPounds: number;
  items: PurchaseItem[];
}

export interface Shipment {
  id: string;
  shipper: string;
  estimatedArrival: Date;
  purchaseDate: Date;
  weekStartDate: Date;
  products: ProductPurchase[];
  createdAt: Date;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  purchaseOrderNumber?: string;
  rejectedAt?: Date;
  purchaserId?: string;
}

// Keep Purchase interface for backward compatibility and quota calculations
export interface Purchase {
  id: string;
  productId: string;
  totalPounds: number;
  purchaseDate: Date;
  weekStartDate: Date;
  shipper: string;
  estimatedArrival: Date;
  items: PurchaseItem[];
  createdAt: Date;
  shipmentId?: string;
}

export interface WeeklyQuota {
  id: string;
  productId: string;
  weekStartDate: Date;
  currentTotal: number;
  minQuota: number;
  maxQuota: number;
}

export interface QuotaStatus {
  product: Product;
  currentTotal: number;
  minQuota: number;
  maxQuota: number;
  percentage: number;
  status: 'under' | 'good' | 'near-max' | 'over';
}

// User and Authentication Types
export type UserRole = 'admin' | 'approver' | 'purchaser';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  smsNotifications: boolean;
  slackUserId?: string;
  slackNotifications: boolean;
  createdAt: Date;
  isActive: boolean;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  slackUserId?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}