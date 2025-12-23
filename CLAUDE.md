# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **n8n-monitor** mobile application built with Expo (SDK 54) and React Native. The app allows users to **monitor and manage their n8n workflows** using the n8n API. It provides real-time visibility into workflow executions, status, and performance across iOS, Android, and Web platforms.

**Tech Stack:**
- Expo SDK 54 with React Native 0.81.5
- React 19.1.0
- Expo Router v6 (file-based routing)
- TypeScript (strict mode)

**Purpose:**
Monitor n8n workflow executions, view workflow status, track performance metrics, and manage workflows from a mobile device.

## Using Context7 for Documentation

**IMPORTANT:** When working with this codebase, **always use Context7** to get up-to-date documentation for libraries and frameworks. Context7 provides current API references, code examples, and best practices.

### When to Use Context7
You MUST use Context7 when:
- Implementing features with Expo SDK, React Native, or Expo Router
- Working with React hooks, components, or React 19 features
- Integrating third-party libraries (react-query, date-fns, etc.)
- Troubleshooting API usage or understanding library capabilities
- Looking for code examples or implementation patterns

### How to Use Context7
1. **Resolve library ID first**: Use `mcp__context7__resolve-library-id` with the library name
2. **Fetch documentation**: Use `mcp__context7__get-library-docs` with the resolved library ID
3. **Specify mode**: Use `mode='code'` for API references/examples, `mode='info'` for concepts/guides

### Key Libraries to Query via Context7
- **Expo**: `/expo/expo` - Core Expo SDK APIs
- **React Native**: `/facebook/react-native` - Mobile platform APIs
- **Expo Router**: `/expo/router` - File-based routing (use this instead of outdated knowledge)
- **React**: `/facebook/react` - React 19 features and hooks
- **TypeScript**: `/microsoft/TypeScript` - Type definitions and patterns
- **TanStack Query** (if installed): `/tanstack/query` - Data fetching patterns
- **React Navigation**: `/react-navigation/react-navigation` - Navigation theming

### Example Workflow
```
User asks: "Add a workflow list screen with pull-to-refresh"

1. Query Context7 for Expo Router: resolve-library-id("expo router")
2. Query Context7 for React Native: resolve-library-id("react native")
3. Get docs: get-library-docs("/expo/router", topic="routes and navigation")
4. Get docs: get-library-docs("/facebook/react-native", topic="FlatList RefreshControl")
5. Implement using up-to-date patterns from Context7 results
```

**Never rely solely on training data** for library-specific implementation details. Always verify current API usage with Context7.

## Development Commands

### Essential Commands
- `npm install` - Install dependencies
- `npm start` or `npx expo start` - Start the development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run web version
- `npm run lint` - Run ESLint
- `npm run reset-project` - Reset to blank project (moves starter code to app-example)

### Testing & Development
No test runner is currently configured in this project.

## Architecture

### Routing (Expo Router v6)
This project uses **file-based routing** via Expo Router. Routes are automatically generated from the `app/` directory structure.

**Key routing concepts:**
- `app/_layout.tsx` - Root layout (theme provider, navigation setup)
- `app/(tabs)/` - Tab-based navigation (if using tabs)
- `app/[id].tsx` - Dynamic routes (e.g., workflow details by ID)
- Routes are automatically typed with `expo.experiments.typedRoutes: true`

### n8n API Integration

The app integrates with the **n8n REST API** to fetch and manage workflows.

**n8n API Documentation:**
- Official docs: https://docs.n8n.io/api/
- **Use Context7**: Query `resolve-library-id("n8n")` first, then use Context7 to get current API documentation and examples

**Key API Endpoints to use:**
- `GET /workflows` - List all workflows
- `GET /workflows/:id` - Get workflow details
- `GET /executions` - List workflow executions
- `GET /executions/:id` - Get execution details
- `POST /workflows/:id/activate` - Activate a workflow
- `POST /workflows/:id/deactivate` - Deactivate a workflow

**Authentication:**
n8n API uses API key authentication. Store credentials securely using:
- `expo-secure-store` for production (encrypted storage)
- AsyncStorage for development/testing
- Never commit API keys to the repository

**API Client:**
Create a centralized API client in `services/n8n-api.ts` to handle:
- Base URL configuration (user's n8n instance URL)
- API key management
- Request/response handling
- Error handling

### TypeScript Configuration
- Strict mode enabled
- Path alias `@/*` maps to project root for cleaner imports
- Example: `import { Colors } from '@/constants/theme'`
- Extends `expo/tsconfig.base`
- Typed routes enabled via `app.json` experiments

### Theme & Styling
- **Theme System**: Light/dark mode support via `@react-navigation/native` ThemeProvider
- **Colors**: Defined in `constants/theme.ts` with separate light/dark palettes
- **Fonts**: Platform-specific font definitions (iOS, web, default) in `constants/theme.ts`
- **Color Scheme Hook**: `hooks/use-color-scheme.ts` (with web-specific variant)
- **Themed Components**: `ThemedText` and `ThemedView` in `components/` automatically adapt to theme

### Project Structure
```
app/                 # Expo Router file-based routes
components/          # Reusable React components
  ├── ui/           # UI primitives (buttons, cards, lists)
  └── workflows/    # n8n workflow-specific components
services/           # API clients and business logic
  └── n8n-api.ts   # n8n API client
hooks/              # Custom React hooks
constants/          # Theme colors, API constants
types/              # TypeScript type definitions
  └── n8n.ts       # n8n API response types
```

### Key Features & Configuration
- **New Architecture**: Enabled via `"newArchEnabled": true` in app.json
- **React Compiler**: Experimental feature enabled in app.json
- **Typed Routes**: Experimental typed routes enabled
- **Haptic Feedback**: Custom `HapticTab` component used for tab bar buttons
- **Platform-specific Icons**: `IconSymbol` component with iOS-specific variant using SF Symbols

### Dependencies to Note
- `expo-router@~6.0.21` - File-based routing
- `react-native-reanimated@~4.1.1` - Animations (imported in root layout)
- `react-native-gesture-handler@~2.28.0` - Gesture handling
- `@expo/vector-icons@^15.0.3` - Icon library
- `expo-haptics@~15.0.8` - Haptic feedback

## Development Workflow

### Adding New Screens
Add routes to the `app/` directory following Expo Router conventions:
- Tab screens: `app/(tabs)/workflows.tsx`, `app/(tabs)/settings.tsx`
- Detail screens: `app/workflow/[id].tsx`
- Modals: `app/settings-modal.tsx`

### Working with n8n API
1. Define TypeScript types in `types/n8n.ts` based on API responses
2. Create API functions in `services/n8n-api.ts`
3. Use custom hooks (e.g., `useWorkflows()`) to fetch data in components
4. Handle loading and error states appropriately

### Theming
- Use themed components from `/app-example/components/` as reference
- Access colors via `Colors[colorScheme]` from `constants/theme.ts`
- Support both light and dark modes

### Dependencies Needed
To implement the n8n monitoring features, you may need to install:
- `expo-secure-store` - Secure API key storage
- `@tanstack/react-query` or `swr` - Data fetching and caching
- `date-fns` or `dayjs` - Date formatting for execution timestamps

**IMPORTANT:** Before implementing with any of these libraries, use Context7 to get current documentation and best practices. Query the library name first with `resolve-library-id`, then fetch docs with `get-library-docs`.

## Current Implementation Details

### Internationalization (i18n)
The app supports **Spanish and English** via a custom language context:
- **Context**: `context/LanguageContext.tsx` - Provides language switching functionality
- **Translations**: `services/i18n/strings.ts` - Contains all translations for both languages
- **Usage**: Use `const { t, language, setLanguage } = useLanguage()` hook in components
- **Storage**: Selected language is persisted in `expo-secure-store`

**Adding new translations:**
1. Add the key and Spanish text to `translations.es` in `strings.ts`
2. Add the same key with English text to `translations.en`
3. Use in components via `{t.yourKey}`

### Implemented Features

#### 1. Workflow List Screen (`app/index.tsx`)
- **Stats Dashboard**: Shows total, active, and inactive workflow counts
- **Search Bar**: Filter workflows by name with real-time search
- **Filter Chips**: Filter by all/active/inactive status
- **Workflow Cards**: Display workflow status, last update time, and activity indicators
- **Floating Menu**: Bottom navigation with:
  - Home icon (pink when active, gray otherwise - NO background color)
  - Refresh button (always gray)
  - Add server button (always gray)
  - Settings button (always gray)
- **Pull to Refresh**: Swipe down to refresh workflow list
- **Greeting**: Time-based greeting (Buenos días/Buenas tardes/Buenas noches)

#### 2. Workflow Detail Screen (`app/workflow/[id].tsx`)
**Header:**
- Dynamic gradient background (changes color based on active status)
- Back button with proper navigation
- Workflow name in header

**Hero Section:**
- Large workflow icon/artwork placeholder
- Workflow name
- Status tag: "ACTIVO" (green background) or "PAUSADO" (gray background)
- Last updated timestamp
- Workflow tags (if any)

**Action Buttons:**
- **Play/Pause button**:
  - Green background when active (shows pause icon)
  - White background when inactive (shows play icon)
  - **Disabled when workflow has 0 nodes** with validation message: "El workflow necesita al menos un nodo"
  - Centered alignment
  - Confirmation dialog before toggling state

**Statistics Section:**
- **Three stat cards:**
  1. Successful executions (green text)
  2. Failed executions (red text)
  3. **Node count** (white text) - Shows total number of nodes in the workflow

**Execution History:**
- **Advanced Filter System:**
  - **Status Filter**: Segmented control with badges showing counts
    - All executions
    - Successful (green when selected)
    - Error (red when selected)
    - Running (orange when selected, only shown if there are running executions)
  - **Time Filter**: Pill-style buttons
    - All time
    - Last 24 hours
    - Last 7 days
    - Last 30 days
  - **Results Counter**: Shows filtered results count
- **Execution List**: Shows status icon, title, date, and duration
- **Pagination**: 10 items per page with prev/next controls
- **Pull to Refresh**: Update workflow and execution data
- **Empty States**: Different messages for no executions vs no filtered results

#### 3. Server Configuration (`app/setup.tsx`)
- **Multi-server support**: Manage multiple n8n instances
- **Server List**: Shows all configured servers with active/inactive status
- **Search Bar**: Filter servers by name or URL
- **Server Cards**: Display name, URL, status badge, and action buttons
- **Add/Edit Form**:
  - Server name input
  - Server URL input (auto-cleans trailing slashes and /api paths)
  - API Key input (secure entry)
  - **API Key Help**: Information box explaining how to create an API key:
    - Spanish: "Para crear un API Key: Configuración → API → Crear API Key en tu instancia de n8n"
    - English: "To create an API Key: Settings → API → Create API Key in your n8n instance"
  - Test Connection button (validates credentials)
  - Save button
- **Active Server**: Visual indicator for currently connected server
- **Delete Server**: Confirmation dialog before deletion

#### 4. Onboarding Flow (`app/onboarding.tsx`)
- Multi-step introduction for first-time users
- Explains app features and setup process
- Can be accessed again via settings

### Design System

**Color Palette:**
```typescript
const THEME = {
  background: '#121212',      // Main background
  surface: '#181818',         // Card backgrounds
  surfaceHighlight: '#282828', // Elevated surfaces
  textPrimary: '#FFFFFF',     // Primary text
  textSecondary: '#B3B3B3',   // Secondary text
  accent: '#EA4B71',          // n8n Primary Pink
  success: '#22c55e',         // Green for success/active
  error: '#FF5252',           // Red for errors
};
```

**UI Patterns:**
- **Spotify-inspired design**: Dark theme with vibrant accents
- **Gradient headers**: Dynamic colors based on content state
- **Blur effects**: Using `expo-blur` for floating menus
- **Animated transitions**: React Native Reanimated for smooth animations
- **Glass morphism**: Translucent surfaces with blur

### Validation Rules

1. **Workflow Activation**:
   - Workflows with 0 nodes cannot be activated
   - Button is visually disabled (gray, opacity 0.5)
   - Help text shown: "El workflow necesita al menos un nodo"

2. **Server Configuration**:
   - All fields required (name, URL, API key)
   - URL must start with http:// or https://
   - URL is auto-cleaned (removes trailing slashes, /api/v1, /workflow paths)
   - Test connection validates credentials before saving

### State Management
- **TanStack Query (React Query)** for server state and caching
- **Local state** with React hooks for UI state
- **Expo Secure Store** for sensitive data (API keys, active server)
- **AsyncStorage** for non-sensitive preferences (language, onboarding status)

### Error Handling
- Network errors show user-friendly messages
- Retry buttons on failed data fetches
- Loading states for all async operations
- Empty states for lists with no data
- Validation messages for form inputs

### Performance Optimizations
- Query caching with 5-minute stale time
- Automatic retry (2 attempts) for failed queries
- Pull-to-refresh with visual feedback
- Pagination for long execution lists (10 items per page)
- Virtualized lists with FlatList
- Animated list items with staggered delays

### Known Limitations
- **Background notifications**: Requires development build (not available in Expo Go)
  - If implementing notifications in the future, users must create a development build with `npx expo run:ios` or `npx expo run:android`
- **Workflow editing**: Currently view-only, no node editing capabilities
- **Execution details**: Limited to list view, no detailed node-by-node execution data yet

### Future Enhancement Ideas
Potential features to implement (not yet developed):
1. Execute workflow manually from app
2. View detailed execution logs and node data
3. Dashboard with charts/graphs
4. Favorite workflows
5. Advanced sorting and filtering
6. Duplicate/export workflows
7. Offline mode with data caching
8. Home screen widgets
9. Light/dark theme toggle
10. Basic workflow editing (name, description, tags)
