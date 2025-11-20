# Wave Terminal - Project Structure

## Root Directory Organization

### Core Application
- **`frontend/`** - React/TypeScript frontend application
  - `app/` - Main application components (AI panel, blocks, modals, workspace)
  - `layout/` - Layout management system
  - `types/` - TypeScript type definitions
  - `util/` - Frontend utilities and helpers

- **`emain/`** - Electron main process
  - Main process logic, window management, and system integration
  - API integrations (Amazon Q), authentication, and updater

- **`pkg/`** - Go backend services and packages
  - Core business logic, database operations, and service layer
  - AI integration, remote connections, and file operations

### Command Line Tools
- **`cmd/`** - Go command-line applications
  - `server/` - Main Wave server
  - `wsh/` - Wave Shell helper utility
  - `test*/` - Various testing utilities
  - Code generation tools (generatego, generatets, generateschema)

### AI & MCP Integration
- **`mcp-servers/`** - Model Context Protocol servers
  - Filesystem, terminal, memory, and Kubernetes MCP servers
  - Python and JavaScript implementations

- **`aiprompts/`** - AI system prompts and configurations
  - Specialized prompts for different AI workflows and integrations

### Infrastructure & DevOps
- **`tsunami/`** - UI framework for dynamic interfaces
  - Go-based reactive UI system with VDOM
  - Templates and demo applications

- **`scripts/`** - Build and automation scripts
  - Kubernetes setup, AI agent management, security auditing
  - Git workflow automation and monitoring services

### Data & Configuration
- **`db/`** - Database schemas and migrations
  - SQLite migration files for wstore and filestore
  - Database initialization and setup

- **`schema/`** - JSON schemas for configuration
  - AI presets, connections, settings, and widgets schemas

### Documentation & Assets
- **`docs/`** - Docusaurus-based documentation site
  - User guides, API reference, and development docs

- **`assets/`** - Static assets and branding
  - Icons, logos, screenshots, and branding materials

- **`public/`** - Public web assets
  - Fonts, FontAwesome icons, and styling resources

## Architectural Patterns

### Frontend Architecture
- **Component-Based**: React components with TypeScript
- **State Management**: Jotai for atomic state management
- **Styling**: SCSS with Tailwind CSS integration
- **Module Federation**: Path aliases for clean imports (@/app/*, @/element/*)

### Backend Architecture
- **Service Layer Pattern**: Organized services in `pkg/service/`
- **Repository Pattern**: Database operations abstracted through stores
- **Event-Driven**: Event bus system for component communication
- **Microservice-Ready**: Modular package structure for scalability

### Communication Patterns
- **WebSocket**: Real-time communication between frontend and backend
- **RPC**: WSH RPC system for remote operations
- **REST**: HTTP APIs for standard operations
- **Streaming**: Server-sent events for real-time updates

## Core Components

### Application Layer
- **Block System**: Isolated command execution environments
- **Workspace Management**: Multi-workspace support with persistence
- **Connection Management**: Remote server and container connections
- **AI Integration**: Multi-provider AI chat and assistance

### Service Layer
- **Block Service**: Command execution and monitoring
- **Window Service**: UI window and layout management
- **Object Service**: Data persistence and retrieval
- **Workspace Service**: Workspace lifecycle management

### Data Layer
- **WStore**: Main application database (workspaces, blocks, history)
- **FileStore**: File caching and preview system
- **Config System**: Settings and preferences management
- **Migration System**: Database schema versioning

### Integration Layer
- **Remote Connections**: SSH, WSL, and cloud provider integrations
- **AI Providers**: OpenAI, Claude, Google, Perplexity integrations
- **MCP Servers**: Extensible server framework for custom tools
- **Kubernetes**: Native k8s cluster management and monitoring

## Development Workflow
- **Build System**: Vite for frontend, Go build for backend
- **Testing**: Vitest for frontend, Go testing for backend
- **Linting**: ESLint for TypeScript, golangci-lint for Go
- **Documentation**: Storybook for component docs, Docusaurus for user docs
- **Packaging**: Electron Builder for cross-platform distribution