# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a seafood purchasing app designed for buying teams to track their weekly quotas across 8 different seafood products. The app features mobile-first design with clean desktop support.

## Development Commands

- `npm run dev` - Start development server (Note: May have Node version compatibility issues)
- `npm run build` - Build for production (works with current setup)
- `npm run lint` - Run ESLint (configured)
- `npm run preview` - Preview production build

## Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom ocean color palette
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite 7
- **State Management**: React Context with useReducer

### Project Structure
```
src/
├── components/           # React components
│   ├── Dashboard.tsx    # Main dashboard with quota cards
│   ├── PurchaseForm.tsx # Modal form for adding purchases
│   └── Settings.tsx     # Quota configuration
├── hooks/               # Custom React hooks
│   └── useAppState.tsx  # Global state management
├── types/               # TypeScript type definitions
│   └── index.ts         # All app interfaces
├── data/                # Static data
│   └── products.ts      # Seafood products and size categories
└── utils/               # Utility functions
    └── dateUtils.ts     # Week calculation helpers
```

### Core Features
1. **Weekly Quota Tracking**: Automatic Sunday-Saturday week calculation
2. **8 Seafood Products**: Tuna, Swordfish, Mahi, Wahoo, Grouper, Snapper, Salmon, Seabass
3. **Purchase Entry**: Total pounds with size breakdown options
4. **Quota Visualization**: Progress bars with status colors (under/good/near-max/over)
5. **Settings Management**: Configure min/max quotas per product

### Key Components

#### AppState Management (useAppState.tsx)
- Centralized state with React Context
- Actions: ADD_PURCHASE, UPDATE_PRODUCT, SET_WEEKLY_QUOTA
- Provides getQuotaStatus() helper for real-time quota calculations

#### Dashboard (Dashboard.tsx)
- Mobile-first grid layout showing quota cards
- Real-time quota status with color-coded progress bars
- Floating action button for adding purchases
- Settings navigation

#### Purchase Form (PurchaseForm.tsx)
- Modal interface for entering new purchases
- Size breakdown with add/remove functionality
- Validation to ensure breakdown matches total pounds
- Product-specific quota display

### Data Models

#### Key Types
- `Product`: Basic product info with min/max quotas
- `Purchase`: Individual purchase with items breakdown
- `PurchaseItem`: Size category with pounds and notes
- `QuotaStatus`: Calculated status with percentage and color coding

#### Week Management
- Week starts Sunday (weekStartsOn: 0)
- Automatic current week detection
- Week range formatting for display
- Unique week keys for data grouping

### Styling Guidelines
- Mobile-first responsive design
- Ocean color palette (ocean-50 to ocean-900)
- Tailwind utility classes throughout
- Shadow and hover effects for interactivity
- Consistent spacing with gap-4, p-6, mb-8 patterns

### Development Notes
- Node.js version compatibility issues with current versions
- TypeScript strict mode with verbatimModuleSyntax enabled
- Use type-only imports for interfaces
- PostCSS configured with @tailwindcss/postcss plugin
- Build works correctly despite dev server issues

## Backend API (New)

### Overview
The app now includes a Node.js/Express backend for future features like SMS notifications and user management.

### Backend Structure
```
/backend
├── index.js             # Main Express server
├── package.json         # Backend dependencies
├── .env                 # Environment variables (gitignored)
├── .env.example         # Template for environment setup
└── /routes             # API route handlers (future)
```

### Running the Backend
```bash
cd backend
npm install              # Install dependencies (first time)
npm start               # Run production server (port 3001)
npm run dev            # Run with auto-reload (requires Node 18+)
```

### API Endpoints
- `GET /api/health` - Health check endpoint
- `GET /api/test` - Test connection endpoint
- `GET /api/shipments` - Placeholder for shipments data
- `POST /api/notifications/test` - Test notification endpoint (SMS ready)

### Frontend Integration
- API service: `src/utils/api.ts` - Centralized API calls with error handling
- Backend Status: `src/components/BackendStatus.tsx` - Shows connection status
- CORS configured for http://localhost:5173

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `PORT` - Backend server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS
- Future: Twilio, Database, JWT configs

## Future SMS Notification Plan

### Architecture for SMS Features
1. **User Management System**
   - Authentication with JWT tokens
   - User roles: Purchaser, Approver, Admin
   - Phone number storage with encryption

2. **SMS Service Integration (Twilio)**
   - Notification on shipment approval/rejection
   - Include PO numbers in approval messages
   - Opt-in/opt-out functionality
   - Rate limiting for security

3. **Database Requirements**
   - PostgreSQL or MongoDB for user data
   - Notification preferences table
   - Audit log for all SMS sent

4. **Implementation Phases**
   - Phase 1: Backend API setup ✅ (Complete)
   - Phase 2: User authentication system (Next)
   - Phase 3: Database integration
   - Phase 4: Twilio SMS integration
   - Phase 5: Connect to approval/rejection flow

### Cost Estimates
- Twilio SMS: ~$0.0079 per message
- Backend hosting: $0-20/month (Vercel/Railway)
- Database: $0-25/month (Supabase/Neon)
- Total: ~$5-50/month for 100 users

### Security Considerations
- Encrypted phone number storage
- SMS rate limiting
- Opt-in confirmation required
- Audit logging for compliance