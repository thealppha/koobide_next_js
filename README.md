# D-ID Agents 2.0 API Demo - Next.js Migration

This is a complete migration of the original D-ID Agents 2.0 API Demo from vanilla JavaScript to Next.js with React and TypeScript.

## Features

- **WebRTC Streaming**: Real-time video streaming with D-ID agents
- **Speech Recognition**: Voice input using Web Speech API
- **TypeScript**: Full type safety throughout the application
- **React Hooks**: Modern React patterns for state management
- **CSS Modules**: Scoped styling for better maintainability
- **Next.js App Router**: Latest Next.js features and optimizations

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── config/
│   │       └── route.ts          # API configuration endpoint
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with fonts and metadata
│   ├── page.module.css           # Component-specific styles
│   └── page.tsx                  # Main application component
├── hooks/
│   ├── useAgentConnection.ts     # WebRTC connection management
│   └── useWebSpeech.ts          # Speech recognition functionality
└── types/
    └── global.d.ts              # TypeScript declarations
```

## Key Migrations

### 1. HTML to React Components
- Converted static HTML to dynamic React components
- Added proper TypeScript interfaces for all props
- Implemented responsive design with CSS modules

### 2. JavaScript Logic to React Hooks
- **useAgentConnection**: Manages WebRTC connections, agent data, and streaming
- **useWebSpeech**: Handles speech recognition functionality
- All state management converted to React hooks

### 3. CSS to CSS Modules
- Converted global CSS to scoped CSS modules
- Maintained all original styling and animations
- Added proper class naming conventions

### 4. API Integration
- Created secure API endpoint for configuration
- Maintained all original D-ID API functionality
- Added proper error handling and retry logic

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd nextjs-migration
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

The API configuration is handled through the `/api/config` endpoint. Update the configuration in `src/app/api/config/route.ts`:

```typescript
const config = {
  key: "YOUR_DID_API_KEY",
  url: "https://api.d-id.com"
};
```

## Features Comparison

| Feature | Original | Next.js Migration |
|---------|----------|-------------------|
| Framework | Vanilla JS | Next.js + React |
| Type Safety | None | Full TypeScript |
| State Management | Global variables | React hooks |
| Styling | Global CSS | CSS modules |
| API Calls | Direct fetch | Secure API routes |
| Build System | None | Next.js build |
| Performance | Basic | Optimized |

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Components

#### Main Page (`src/app/page.tsx`)
- Main application component
- Manages overall application state
- Handles user interactions and UI updates

#### Agent Connection Hook (`src/hooks/useAgentConnection.ts`)
- WebRTC connection management
- D-ID API integration
- Video streaming logic
- Connection state management

#### Web Speech Hook (`src/hooks/useWebSpeech.ts`)
- Speech recognition functionality
- Voice input handling
- Browser compatibility

## Browser Support

- Chrome/Chromium (recommended for WebRTC)
- Firefox (with limitations)
- Safari (with limitations)
- Edge

## Troubleshooting

### Common Issues

1. **WebRTC Connection Failed**
   - Ensure you're using HTTPS in production
   - Check browser permissions for camera/microphone
   - Verify API key and agent ID

2. **Speech Recognition Not Working**
   - Ensure browser supports Web Speech API
   - Check microphone permissions
   - Try refreshing the page

3. **Build Errors**
   - Run `npm run build` to check for TypeScript errors
   - Ensure all dependencies are installed

## Migration Benefits

1. **Type Safety**: Full TypeScript support prevents runtime errors
2. **Performance**: Next.js optimizations for faster loading
3. **Maintainability**: Modular code structure with React hooks
4. **Scalability**: Easy to extend with additional features
5. **Developer Experience**: Better debugging and development tools
6. **SEO**: Server-side rendering capabilities
7. **Security**: Secure API configuration handling

## Original vs Migrated

The migrated application maintains 100% feature parity with the original while adding:
- Type safety
- Better error handling
- Improved performance
- Modern development patterns
- Better maintainability
- Enhanced security

All original functionality has been preserved and enhanced with modern React and Next.js patterns.