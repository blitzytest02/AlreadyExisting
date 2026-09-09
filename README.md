# Node.js Tutorial Application

A comprehensive Node.js tutorial application that demonstrates fundamental web server capabilities using the Express.js framework. This project serves as an educational resource for developers learning the basics of Node.js, featuring a single `/hello` endpoint that returns a "Hello world" response while showcasing modern development practices and production-ready architecture.

## 🚀 About The Project

This application is built to provide a hands-on, practical example for understanding server-side JavaScript development. It adheres to modern Node.js v22.16.0 LTS and Express.js v5.1.0 standards, demonstrating HTTP request handling, RESTful API endpoint creation, and contemporary web application architecture patterns.

### ✨ Key Features

- **Modern Technology Stack**: Built with Node.js v22.16.0 LTS and Express.js v5.1.0
- **Educational Focus**: Designed specifically for learning fundamental Node.js concepts
- **Production-Ready Architecture**: Demonstrates enterprise-grade development patterns
- **Comprehensive Documentation**: Extensive guides for setup, deployment, and contribution
- **Container Support**: Docker and Kubernetes configurations included
- **Security Best Practices**: Implements modern security standards and patterns

### 🛠 Built With

- **[Node.js](https://nodejs.org/)** (v22.16.0 LTS) - JavaScript runtime providing the server-side execution environment
- **[Express.js](https://expressjs.com/)** (v5.1.0) - Fast, unopinionated web framework with enhanced promise support
- **[npm](https://www.npmjs.com/)** (v11.4.1+) - Package manager for dependency management

### 🏗 Technical Specifications

- **Node.js Version**: v22.16.0 LTS (codename 'Jod') with V8 12.4 JavaScript engine
- **Express Version**: 5.1.0 with automatic promise rejection handling
- **Platform Support**: Cross-platform compatibility (Windows, macOS, Linux)
- **Performance Target**: Response time < 100ms, Memory usage < 50MB
- **Security**: No security headers are added - the only response-header control in the application is `app.disable('x-powered-by')` in `src/backend/app.js`, which removes Express's default banner. ReDoS mitigation is inherited from the framework rather than implemented here: Express 5.1.0 matches routes with `path-to-regexp` 8.x, which dropped the sub-expression patterns that made the earlier matcher vulnerable. Helmet, CORS and rate limiting are deliberately not part of this tutorial

## 🚀 Getting Started

Follow these steps to get a local copy up and running for development and learning purposes.

### 📋 Prerequisites

Ensure you have the following software installed on your system:

- **Node.js**: v18.0.0 or higher (v22.16.0 LTS recommended)
- **npm**: v8.0.0 or higher (comes bundled with Node.js)
- **Git**: For repository cloning and version control

**System Requirements:**
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: 500MB free space for dependencies
- **CPU**: Any modern x64 processor

For detailed prerequisite information and system-specific installation guides, see the [Development Setup Guide](./docs/setup/development.md).

### ⚡ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your_username/nodejs-tutorial-application.git
   ```

2. **Navigate to the backend directory**
   ```bash
   cd nodejs-tutorial-application/src/backend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```
   This installs Express.js 5.1.0 and all required dependencies as specified in `package.json`.

4. **Create environment configuration**
   ```bash
   cp .env.example .env
   ```

For comprehensive installation instructions, automated setup scripts, and troubleshooting guides, please refer to the [Development Setup Guide](./docs/setup/development.md).

## 🖥 Usage

The application provides multiple execution modes for different development scenarios.

### Development Mode (Recommended)

Start the server with automatic restart on file changes:

```bash
npm run dev
```

### Production Mode

Start the server in production-like mode:

```bash
npm start
```

### Direct Execution

Run the application directly with Node.js:

```bash
node server.js
```

### 🌐 Accessing the Application

After starting the server, the application will be available at:

- **Base URL**: `http://localhost:3000`
- **Hello Endpoint**: `http://localhost:3000/hello`

The application exposes no separate health endpoint - `/hello` doubles as the health signal, and the container `HEALTHCHECK` and Kubernetes probes all target it.

### 📱 Testing the Endpoint

**Browser Testing:**
Navigate to `http://localhost:3000/hello` in your web browser to see the "Hello world" response.

**Command Line Testing:**
```bash
# Basic request
curl http://localhost:3000/hello

# With detailed headers
curl -i http://localhost:3000/hello

# Expected response: Hello world
```

**Expected Console Output:**
```
📊 Configuration loaded successfully:
   🚀 App Name: node-tutorial-app
   🌐 Host: localhost
   📡 Port: 3000
   🔧 Environment: development
   📝 Logging: enabled
[INFO]: 🚀 HTTP Server successfully started and listening on port 3000
[INFO]: 🌐 Server is ready to accept HTTP requests
[INFO]: 📍 Local development URL: http://localhost:3000
[INFO]: ⚡ Node.js v22.16.0 | Express 5.1.0 | Environment: development
[INFO]: 🎯 Tutorial application initialized successfully
```

The configuration summary is printed as the configuration module loads, before the server begins listening, and the values above are the built-in defaults; a developer who creates their own `.env` from `.env.example` sees their own values there instead.

## 📚 API Reference

The application exposes a single API endpoint designed to demonstrate fundamental HTTP concepts.

### GET /hello

**Description**: Returns a static "Hello world" message demonstrating basic HTTP GET request handling.

**Technical Details:**
- **Method**: `GET` is the only declared route. Express derives two protocol behaviours from that single declaration rather than adding endpoints: `HEAD` returns 200 with the same headers and no body, and `OPTIONS` returns 200 with `Allow: GET, HEAD`. `POST`, `PUT`, `DELETE` and `PATCH` return 404
- **Response**: The literal string `Hello world` - 11 bytes, no trailing newline
- **Status Code**: 200 OK
- **Content-Type**: text/html; charset=utf-8
- **Content-Length**: 11
- **Performance**: Response time < 100ms

For comprehensive API documentation including request/response examples, error handling, and integration notes, see the [API Documentation](./docs/api/hello.md).

## 🏗 Architecture

This application follows a simple, layered architecture specifically designed for educational purposes while demonstrating production-ready patterns:

### 📁 Project Structure

```
src/backend/
├── server.js              # HTTP server initialization
├── app.js                 # Express application configuration
├── package.json           # Project dependencies and scripts
├── .env.example          # Environment configuration template
├── routes/
│   ├── index.js          # Route aggregation
│   └── hello.js          # Hello endpoint implementation
├── middleware/
│   ├── requestLogger.js  # Request logging middleware
│   └── errorHandler.js   # Error handling middleware
├── utils/
│   └── logger.js         # Logging utility
└── config/
    └── index.js          # Application configuration
```

### 🎯 Core Components

- **HTTP Server**: Node.js core HTTP module with Express framework
- **Routing**: Express Router with modular organization
- **Middleware**: Request logging and error handling
- **Configuration**: Environment-based configuration management
- **Logging**: Console logging that adds `[INFO]:` and `[ERROR]:` level prefixes in development and writes the same messages unprefixed elsewhere

For a detailed explanation of the system architecture, design patterns, and component interactions, please see the [Architecture Overview](./docs/architecture/overview.md).

## 🚢 Deployment

While this project is primarily intended for local educational use, it includes comprehensive deployment configurations for various environments.

### 🐳 Docker Deployment

**Quick Start:**
```bash
# Build Docker image
docker build -t nodejs-tutorial-app -f infrastructure/docker/Dockerfile .

# Run container
docker run -p 3000:3000 nodejs-tutorial-app
```

### ☸️ Kubernetes Deployment

**Deploy to Kubernetes:**
```bash
# Apply all manifests
kubectl apply -f infrastructure/kubernetes/

# Check deployment status
kubectl get all -n tutorial-app
```

### 🔄 Automated Deployment

The project includes GitHub Actions workflows for continuous integration and deployment:

- **CI Pipeline**: Three steps in `src/backend` on Node.js 22.x and nothing else - `npm ci`, `npm audit` and `npm test`. The audit step runs bare, with no `--audit-level`, so any advisory at any severity fails the job; there is no lint or format step, because neither tool is installed
- **CD Pipeline**: Container building and deployment automation
- **Multi-Environment**: Support for development, staging, and production

For detailed deployment instructions including Docker configurations, Kubernetes manifests, CI/CD setup, and production deployment strategies, please refer to the [Deployment Guide](./docs/setup/deployment.md).

## 🧪 Testing

The application includes comprehensive testing configurations:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode: re-runs affected suites as you edit; nothing runs on a clean checkout until a tracked file changes
npm run test:watch
```

**Testing Stack:**
- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion library for endpoint testing
- **Coverage**: Code coverage reporting and enforcement

## 🔧 Development

### 🛠 Development Tools

- **Nodemon**: Automatic server restart during development
- **ESLint configuration**: `.eslintrc.js` codifies the project's code rules - two-space indentation, single quotes and mandatory semicolons. The tooling itself is not installed as a dependency, so the standard is followed by convention rather than enforced by a command
- **Prettier configuration**: `.prettierrc` records the same indentation, quoting and semicolon rules for editors that read it, and is the one file that sets the 80-column line width (`printWidth: 80`); it is likewise not installed as a dependency
- **Jest**: Testing framework with coverage reporting

### 📝 Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Start | `npm start` | Production server startup |
| Development | `npm run dev` | Development with auto-reload |
| Test | `npm test` | Runs the Jest suite; coverage is collected on every run and the 90% global threshold is enforced |
| Test (coverage) | `npm run test:coverage` | Passes `--coverage` explicitly and writes the same report to `coverage/` |
| Test (watch) | `npm run test:watch` | Re-runs the suites affected by each file change; on a clean checkout it starts by running nothing until a tracked file changes — see [`docs/setup/development.md`](./docs/setup/development.md) §7.3 |

### 🔧 Configuration

The application uses environment variables for configuration:

```env
# Server configuration
PORT=3000
NODE_ENV=development
# Read into config.host and shown at startup, but never reaches server.listen - the bound interface is unaffected
HOST=localhost
# Read by no module - setting this has no effect
LOG_LEVEL=info
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

### 📋 Contribution Guidelines

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Follow coding standards** (ESLint configuration)
4. **Write or update tests** (maintain 90% coverage)
5. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
6. **Push to the branch** (`git push origin feature/AmazingFeature`)
7. **Open a Pull Request**

### 🎯 Development Standards

- **Code Quality**: Follow ESLint and Prettier configurations
- **Testing**: All new features must include appropriate tests
- **Documentation**: Update documentation for any API changes
- **Security**: Follow security best practices and guidelines
- **Performance**: Maintain response time targets < 100ms

For comprehensive contribution guidelines, development setup, coding standards, and pull request process, please see the [Contributing Guidelines](./.github/CONTRIBUTING.md).

## 📄 License

This project is distributed under the ISC License, declared in the `license` field of [`src/backend/package.json`](./src/backend/package.json).

The ISC License allows for:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

## 📞 Support & Resources

### 📖 Documentation

- **[Development Setup](./docs/setup/development.md)** - Comprehensive local development guide
- **[Deployment Guide](./docs/setup/deployment.md)** - Docker and Kubernetes deployment instructions
- **[API Documentation](./docs/api/hello.md)** - Detailed endpoint specifications
- **[Architecture Overview](./docs/architecture/overview.md)** - System design and component details
- **[Contributing Guidelines](./.github/CONTRIBUTING.md)** - Contribution process and standards

### 🆘 Getting Help

- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/your_username/your_repository/issues)
- **Discussions**: Ask questions and share ideas in [GitHub Discussions](https://github.com/your_username/your_repository/discussions)
- **Documentation**: Check this README and linked documentation for detailed information

### 🌟 Educational Value

This tutorial application demonstrates:

- **Modern Node.js Development**: Node.js v22.16.0 LTS with ES2022+ features
- **Express.js Framework**: Version 5.1.0 with enhanced promise support
- **Production Patterns**: Enterprise-grade architecture and security practices
- **DevOps Integration**: Docker, Kubernetes, and CI/CD configurations
- **Testing Strategies**: Comprehensive testing with coverage requirements
- **Documentation Standards**: Professional documentation and API specifications

---

## 🎯 Next Steps

After successfully running the tutorial application, consider exploring:

1. **Extend the API**: Add more endpoints and functionality
2. **Database Integration**: Connect to databases for data persistence
3. **Authentication**: Implement user authentication and authorization
4. **Monitoring**: Add application performance monitoring
5. **Security**: Enhance security with additional middleware
6. **Testing**: Expand test coverage and add end-to-end tests

**Happy learning and coding! 🚀**

---

*This project is part of the Node.js learning ecosystem, designed to provide hands-on experience with modern web development practices while maintaining simplicity and educational clarity.*