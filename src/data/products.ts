import type { Product } from '../types';

export const SEAFOOD_PRODUCTS: Product[] = [
  {
    id: 'tuna',
    name: 'Tuna',
    minQuota: 100,
    maxQuota: 500,
  },
  {
    id: 'sword',
    name: 'Swordfish',
    minQuota: 80,
    maxQuota: 300,
  },
  {
    id: 'mahi',
    name: 'Mahi',
    minQuota: 60,
    maxQuota: 250,
  },
  {
    id: 'wahoo',
    name: 'Wahoo',
    minQuota: 50,
    maxQuota: 200,
  },
  {
    id: 'grouper',
    name: 'Grouper',
    minQuota: 70,
    maxQuota: 350,
  },
  {
    id: 'snapper',
    name: 'Snapper',
    minQuota: 90,
    maxQuota: 400,
  },
  {
    id: 'salmon',
    name: 'Salmon',
    minQuota: 120,
    maxQuota: 600,
  },
  {
    id: 'seabass',
    name: 'Seabass (Branzini)',
    minQuota: 40,
    maxQuota: 180,
  },
  {
    id: 'other',
    name: 'Other',
    minQuota: 0,
    maxQuota: 1000,
  },
];

export const COMMON_SIZE_CATEGORIES = [
  'Small (under 5 lbs)',
  'Medium (5-15 lbs)',
  'Large (15-30 lbs)',
  'Extra Large (30+ lbs)',
];

export const PRODUCT_SIZE_CATEGORIES: Record<string, string[]> = {
  tuna: [
    '70+ lbs',
    '60+ lbs',
    '40-59 lbs',
    '30-40 lbs',
    'Other'
  ],
  // Other products use common size categories for now
  sword: COMMON_SIZE_CATEGORIES,
  mahi: COMMON_SIZE_CATEGORIES,
  wahoo: COMMON_SIZE_CATEGORIES,
  grouper: COMMON_SIZE_CATEGORIES,
  snapper: COMMON_SIZE_CATEGORIES,
  salmon: COMMON_SIZE_CATEGORIES,
  seabass: COMMON_SIZE_CATEGORIES,
};