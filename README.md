# n8n Monitor

A mobile application for monitoring and managing your n8n workflows on the go. Built with Expo and React Native, n8n Monitor provides real-time visibility into workflow executions, status tracking, and performance metrics across iOS, Android, and Web platforms.

## Features

- **Workflow Monitoring**: View all your n8n workflows in one place
- **Execution Tracking**: Monitor workflow executions in real-time
- **Status Management**: Activate/deactivate workflows remotely
- **Performance Metrics**: Track workflow performance and execution history
- **Cross-Platform**: Works on iOS, Android, and Web
- **Secure Authentication**: API key storage with expo-secure-store
- **Dark Mode Support**: Full light/dark theme support

## Tech Stack

- **Expo SDK 54** with React Native 0.81.5
- **React 19.1.0** with experimental features
- **Expo Router v6** for file-based routing
- **TypeScript** in strict mode
- **n8n REST API** integration

## Prerequisites

- Node.js 18+ and npm
- An active n8n instance (cloud or self-hosted)
- n8n API key ([how to generate](https://docs.n8n.io/api/authentication/))
- iOS Simulator (macOS), Android Emulator, or Expo Go app

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure n8n Connection

Before running the app, you'll need:
- Your n8n instance URL (e.g., `https://your-instance.n8n.cloud` or `http://localhost:5678`)
- Your n8n API key

The app will prompt you to enter these credentials on first launch.

### 3. Start the Development Server

```bash
npm start
# or
npx expo start
```

### 4. Run on Your Platform

Choose your platform:

- **iOS Simulator** (macOS only):
  ```bash
  npm run ios
  ```

- **Android Emulator**:
  ```bash
  npm run android
  ```

- **Web Browser**:
  ```bash
  npm run web
  ```

- **Physical Device**: Scan the QR code with Expo Go app

## Development

### Project Structure

```
n8n-monitor/
├── app/                    # Expo Router routes
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home/setup screen
│   └── setup.tsx          # Initial configuration
├── components/            # Reusable components
│   ├── ui/               # UI primitives
│   └── workflows/        # Workflow-specific components
├── services/             # API clients and business logic
│   └── n8n-api.ts       # n8n API integration
├── types/                # TypeScript definitions
│   └── n8n.ts           # n8n API types
├── hooks/                # Custom React hooks
├── constants/            # Theme and configuration
└── CLAUDE.md            # AI assistant instructions

```

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run web version
- `npm run lint` - Run ESLint
- `npm test` - Run tests (when configured)

### Working with Claude Code

This project includes a `CLAUDE.md` file with instructions for AI-assisted development. Key points:

- **Context7 Integration**: Always use Context7 for up-to-date library documentation
- **File-based Routing**: Routes are auto-generated from the `app/` directory
- **Type Safety**: Strict TypeScript with typed routes enabled
- **Theme System**: Use themed components for automatic dark mode support

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines.

## n8n API Integration

This app uses the [n8n REST API](https://docs.n8n.io/api/) to communicate with your n8n instance.

### Key API Endpoints

- `GET /workflows` - List all workflows
- `GET /workflows/:id` - Get workflow details
- `GET /executions` - List executions
- `GET /executions/:id` - Get execution details
- `POST /workflows/:id/activate` - Activate workflow
- `POST /workflows/:id/deactivate` - Deactivate workflow

### Authentication

The app uses API key authentication. Your credentials are stored securely using:
- `expo-secure-store` (encrypted) on native platforms
- Secure storage on web platforms

**Never commit API keys to the repository.**

## Configuration

### TypeScript

- Path alias `@/*` configured for cleaner imports
- Strict mode enabled
- Typed routes via Expo Router

Example:
```typescript
import { Colors } from '@/constants/theme';
import { N8nClient } from '@/services/n8n-api';
```

### Theme

The app supports light and dark modes out of the box. Theme colors are defined in `constants/theme.ts`.

Use themed components:
```tsx
import { ThemedText, ThemedView } from '@/components/themed';
```

## Roadmap

- [ ] Workflow execution history with detailed logs
- [ ] Push notifications for workflow events
- [ ] Workflow statistics and analytics
- [ ] Quick actions for common workflows
- [ ] Offline support with local caching
- [ ] Widget support (iOS/Android)

## Contributing

Contributions are welcome! Please:

1. Read [CLAUDE.md](./CLAUDE.md) for development guidelines
2. Use Context7 for library documentation
3. Follow TypeScript strict mode
4. Test on multiple platforms before submitting PRs
5. Update documentation as needed

## Security

- API keys are stored securely using platform-specific encrypted storage
- Never commit sensitive credentials
- Use environment variables for development configuration
- Follow n8n security best practices

## License

MIT

## Support

- [n8n Documentation](https://docs.n8n.io/)
- [Expo Documentation](https://docs.expo.dev/)
- [Report Issues](https://github.com/yourusername/n8n-monitor/issues)

## Acknowledgments

Built with:
- [Expo](https://expo.dev) - Universal React applications
- [n8n](https://n8n.io) - Workflow automation platform
- [React Native](https://reactnative.dev) - Mobile framework
