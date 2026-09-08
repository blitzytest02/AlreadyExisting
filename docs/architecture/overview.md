# System Architecture Overview

This document provides a comprehensive architectural overview of the Node.js tutorial application's system design. It describes the core components, their interactions, data flow patterns, and the overall architectural decisions employed in building a simple yet production-ready HTTP server using modern Node.js and Express.js frameworks.

## 1. High-Level Architecture

### 1.1. System Overview

The Node.js tutorial application employs a **Single-Threaded Event-Driven Architecture** pattern, leveraging Node.js v22 officially transitioned into Long Term Support (LTS) with the codename 'Jod'. This architectural approach is specifically designed for educational purposes, demonstrating fundamental HTTP server concepts through a minimalist implementation while maintaining production-ready patterns.

**Architectural Style and Rationale:**
The system follows a **Layered Architecture** pattern with clear separation between the HTTP transport layer, application framework layer, and business logic layer. Node.js employs a "Single Threaded Event Loop" design where the JavaScript event-based model and JavaScript callback mechanism are utilized in the Node.js Processing Model. This design choice optimizes for simplicity and educational clarity while maintaining scalable patterns.

**Key Architectural Principles:**
- **Event-Driven Processing**: Single-threaded event loop design with JavaScript event-based model and callback mechanisms
- **Non-Blocking I/O**: Asynchronous request handling for optimal performance and educational demonstration
- **Modular Design**: Clear separation of concerns between HTTP handling, routing, and application logic
- **Stateless Operation**: No persistent state management required, enabling simple horizontal scaling patterns

**System Boundaries and Major Interfaces:**
The system operates within a single Node.js process boundary, exposing one primary interface: an HTTP endpoint accessible via standard HTTP/1.1 protocol. The Node.js server accepts user requests, processes them through the Express.js framework, and returns results to users through the standardized request-response cycle.

### 1.2. Architectural Diagram

The following diagram illustrates the high-level component interactions and data flow within the system:

```mermaid
graph TD
    A[HTTP Client] -->|HTTP Request| B("Node.js HTTP Server<br/>server.js")

    subgraph App["Express Application - app.js, in registration order"]
        direction TB
        L["1. Request Logger<br/>middleware/requestLogger.js"]
        D["2. Aggregate Router<br/>routes/index.js"]
        E["Hello Router<br/>routes/hello.js"]
        NF["Express default handler<br/>404 HTML page"]
        H["3. Terminal Error Handler<br/>four-arity, registered last<br/>middleware/errorHandler.js"]
        L -->|"next()"| D
        D -->|"mounted at /hello"| E
        D -->|"no route matches"| NF
        E -.->|"throw or next(err)"| H
    end

    B -->|"http.createServer(app) request listener"| L
    E -->|"res.send('Hello world')"| RES["HTTP Response"]
    NF --> RES
    H -->|"JSON 500 envelope"| RES
    RES -->|Response Delivery| A

    F[Event Loop] -->|"Socket readiness and I/O events"| B
    G[Node.js Runtime] -->|"http module"| B
    G -->|"Express 5.1.0"| App

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style F fill:#fff3e0
    style G fill:#f3e5f5
    style H fill:#ffcdd2
```

This architecture demonstrates the flow from an HTTP client request through the Node.js runtime into the Express application's middleware pipeline, drawn in the order `app.js` registers it — request logger first, the aggregated router second, the terminal error handler last — and back out as one of three responses: the hello handler's `Hello world`, Express's own default 404 page for a request matching no route, or the error handler's JSON 500 envelope. That last edge is dashed because it is a capability rather than an exercised path: no route in this tutorial throws or forwards an error. The event loop drives the server's socket readiness and I/O events, while the `/hello` handler itself runs synchronously.

## 2. Core Components

### 2.1. HTTP Server (`server.js`)

The HTTP Server component serves as the foundational entry point of the application, responsible for initializing the Node.js HTTP server, binding to a network port, and handling basic server lifecycle events. This component leverages Node.js v22.16.0 LTS for stability and long-term support.

**Primary Responsibilities:**
- Network socket management and TCP connection handling using Node.js built-in HTTP module
- HTTP request parsing and initial validation according to HTTP/1.1 protocol standards
- Response formatting and delivery to HTTP clients
- Integration with Express.js framework layer for application logic processing
- Server lifecycle management covering startup and fatal-error handling: the `listen` callback reports readiness, a server `error` listener classifies bind failures such as `EADDRINUSE`, and process-level `unhandledRejection` and `uncaughtException` handlers log and exit. Graceful shutdown is **not** implemented — no `SIGTERM` or `SIGINT` handler is registered and `server.close()` is never called outside the test suite, so a termination signal ends the process without draining in-flight requests

**Technical Specifications:**
- **Runtime Environment**: Node.js v22.16.0 LTS with 'Jod' codename for critical updates and security support
- **Port Configuration**: Default port 3000, configurable via environment variables for deployment flexibility
- **Performance Characteristics**: Server startup time < 5 seconds, request processing latency < 50ms
- **Memory Management**: Base allocation < 30MB, efficient garbage collection for request objects

### 2.2. Express Application (`app.js`)

The Express Application component orchestrates the web framework functionality using Express.js 5.1.0. This component provides the middleware architecture, routing capabilities, and request/response processing pipeline essential for HTTP request handling.

**Core Functionality:**
- **Middleware Stack Management**: Sequential request processing through configurable middleware pipeline
- **Route Registration and Matching**: URL pattern matching using path-to-regexp 8.x for enhanced security
- **Request/Response Object Management**: HTTP request and response object enhancement and manipulation
- **Error Handling Coordination**: Automatic promise rejection handling and error middleware forwarding

**Framework Integration Details:**
Express 5.1.0 introduces significant improvements including middleware that can return rejected promises (automatically caught by the router as errors), enhanced security through ReDoS attack mitigation, and improved performance optimizations. The framework dropped support for Node.js versions before v18, ensuring compatibility with modern JavaScript features and security standards.

**Architectural Patterns:**
- **Middleware Pattern**: Sequential processing pipeline of exactly three registrations, in the order `app.js` applies them — the request logger, the aggregated router, then the terminal error handler. The pipeline observes, routes and terminates requests; it neither transforms nor validates them, because no body parser, sanitizer or validator is mounted anywhere in this application
- **Router Pattern**: Hierarchical route organization — a dedicated `/hello` router mounted on the aggregated router — resolved by Express's default matcher rather than by an exact string comparison. That matcher is case-insensitive and non-strict, which is why the path variants recorded in §2.3 also reach the handler
- **Promise-Based Error Handling**: Modern error propagation using async/await patterns and automatic error forwarding

### 2.3. Route Handler (`routes/hello.js`)

The Hello Route Handler implements the core business logic for the `/hello` endpoint, demonstrating fundamental HTTP endpoint implementation patterns and response generation techniques. This component represents the simplest possible RESTful API endpoint while maintaining production-ready code quality.

**Implementation Specifications:**
- **Route Pattern**: `/hello`, matched using the default Express router behavior — matching is case-insensitive and non-strict, so trailing slashes are ignored and `/HELLO` and `/hello/` reach the same handler as `/hello`; no routing option is changed by this application
- **HTTP Method Support**: `GET` is the only declared method. Express derives two further behaviors from that single declaration: `HEAD` returns `200` with the same headers and no body, and `OPTIONS` returns `200` with `Allow: GET, HEAD`. `POST`, `PUT`, `DELETE` and any other unmatched method are answered with `404 Not Found` by Express's default handler
- **Response Format**: Plain text content with "Hello world" static response
- **Content-Type Header**: `text/html; charset=utf-8`, derived by `res.send('Hello world')` — Express infers the status code, `Content-Type` and `Content-Length` (11 bytes) from the string body rather than the handler setting the header explicitly

**Business Logic Pattern:**
The handler follows a stateless design pattern where each request is processed independently without maintaining session state or persistent data. This approach demonstrates scalable API design principles while keeping the implementation simple for educational purposes.

**Error Handling Integration:**
The route handler integrates with Express 5.1.0's enhanced error handling system, where promise rejections are automatically forwarded to error handling middleware. This provides a robust foundation for handling both synchronous and asynchronous errors in a consistent manner.

## 3. Data Flow

The application implements a streamlined **Request-Response Pipeline** where HTTP requests flow through a series of well-defined processing stages. This data flow pattern leverages Node.js event-driven architecture for efficient request processing while maintaining clear separation of concerns.

### 3.1. Primary Data Flow Pattern

**Request Processing Pipeline:**
1. **HTTP Request Reception**: Raw HTTP requests received by Node.js HTTP server and parsed according to HTTP/1.1 protocol
2. **Express Framework Processing**: Request objects enhanced with Express.js methods and middleware processing
3. **Route Matching**: URL path `/hello` matched against registered route patterns using path-to-regexp engine
4. **Handler Execution**: Business logic execution in the hello route handler with response generation
5. **Response Delivery**: HTTP response formatted and delivered to client with appropriate status codes and headers

**Data Transformation Points:**
- **HTTP Parsing**: Raw network data transformed into Express request objects with enhanced properties
- **Route Resolution**: URL paths processed through Express router for handler identification
- **Response Generation**: Static "Hello world" content formatted into complete HTTP response format
- **Content Serialization**: JavaScript string content properly encoded for HTTP transmission

### 3.2. Data Flow Diagram

The following sequence diagram shows the end-to-end data flow for a typical request:

```mermaid
sequenceDiagram
    participant Client as HTTP Client
    participant Server as Node.js HTTP Server
    participant ExpressApp as Express Application
    participant Logger as Request Logger
    participant Router as Aggregate Router
    participant HelloHandler as Hello Route Handler
    participant ErrorHandler as Terminal Error Handler

    Client->>Server: GET /hello
    Server->>ExpressApp: Invoke the request listener
    ExpressApp->>Logger: Mounted first, before any router
    Logger->>Logger: console.log method, path and body
    Logger->>Router: next()
    Router->>Router: Match the /hello mount

    alt Route matched
        Router->>HelloHandler: GET / on the hello router
        HelloHandler->>Server: res.send writes the body and ends the response
        Server->>Client: 200 OK, Content-Type text/html, 11 bytes
    else No route matches
        Router->>Server: Express default handler writes an HTML 404
        Server->>Client: 404 Not Found, body names the method and path
    else Handler throws or returns a rejected promise
        HelloHandler->>ErrorHandler: next(err) reaches the last-registered handler
        ErrorHandler->>Server: res.status(500) with the generic JSON envelope
        Server->>Client: 500 Internal Server Error, application/json
    end

    Note over Client,ErrorHandler: Full request-response cycle under the documented 100 ms budget
    Note over Logger,ErrorHandler: Every request is logged, including one that matches no route
```

**Performance Characteristics:**
The data flow is optimized for minimal latency with target response times under 100ms for the complete request-response cycle. The single-threaded event loop processes requests asynchronously, allowing efficient handling of concurrent connections without the overhead of thread management.

**State Management:**
The system maintains a stateless design where no persistent data is stored between requests. Request-specific objects are scoped to a single request, and once the response has completed and nothing holds a reference to them they become *eligible* for garbage collection; V8 then reclaims them on its own schedule rather than at a fixed point in the request lifecycle. Reachability is what governs this, not request completion — a reference retained past the response, whether on a module-level object, in a closure or by a long-lived listener, keeps the object alive. Statelessness therefore narrows the opportunity for a leak, but automatic collection does not by itself rule one out.

## 4. Cross-Cutting Concerns

### 4.1. Logging

The application implements a lightweight logging strategy built on the built-in Node.js `console` methods, wrapped by a small logger utility, and request logging is implemented as middleware so that every incoming request is recorded consistently for debugging purposes. The logger writes synchronously: `logger.info` delegates directly to `console.log`, prefixing the line with `[INFO]:` only when `NODE_ENV` is `development`.

**Logging Implementation:**
- **Request Logging**: Each incoming HTTP request is logged with exactly three fields — the HTTP method, the request path, and the normalized request body, which is rendered as `{}` when no body is present
- **Error Logging**: The error-handling middleware logs unhandled errors to the error stream with the error message, stack, and name, plus request context (URL, method, headers, route parameters, and query), an ISO timestamp, the User-Agent, and the client IP address

**Log Format Structure:**
```
[INFO]: HTTP Request - Method: GET Path: /hello Body: {}
```

Outside development the identical line is emitted without the `[INFO]: ` prefix, since the prefix is applied only when `NODE_ENV` is `development`. This is a single human-readable console line rather than a machine-structured format: it carries no JSON, no fixed field positions, and no level, status, latency, or timestamp fields. It stays easy to filter during development because the fixed `HTTP Request -` prefix and the `Method:`, `Path:`, and `Body:` labels are greppable.

### 4.2. Error Handling

The application handles errors on two distinct paths, and they do not share a response format. An error raised inside a route handler — thrown synchronously, or surfaced as a rejected promise, which Express 5.1.0 forwards automatically — reaches the custom four-arity middleware in `middleware/errorHandler.js`, registered last in `app.js` so that every router precedes it. That middleware logs the detail internally and answers with a generic JSON envelope. A request matching no route never reaches it: Express's own default handler answers that case with an HTML page. So only the first path is centralized through application middleware, and only that path produces JSON.

**Error Handling Architecture:**
- **Route-Level Errors**: Errors thrown in route handlers are automatically caught by Express error middleware
- **Promise Rejection Handling**: Automatic forwarding of rejected promises to error handling middleware
- **HTTP Error Responses**: Two formats rather than one — the custom middleware emits `application/json` carrying a four-field envelope (`error`, `status`, `timestamp`, `path`), while Express's default handler emits an HTML page. No single standardized format spans both paths
- **Error Information Security**: Generic error messages sent to clients while detailed errors are logged internally

**Error Response Categories:**
- **404 Not Found**: For requests to non-existent routes and, equally, for unsupported HTTP methods on `/hello` — Express's default handler answers both cases with an HTML error page (`text/html; charset=utf-8`) whose body names the attempted method and path, such as `Cannot POST /hello`
- **500 Internal Server Error**: For application errors reaching the custom middleware, which sends a generic message so that no stack trace or internal detail is exposed to the client. The status is always `500` — the handler sets it unconditionally and never consults `err.status`, so every error routed to it is reported as a server error regardless of the status the error itself carries

### 4.3. Configuration

Application configuration is managed through environment variables with sensible defaults, following twelve-factor app methodology for configuration management. This approach enables deployment flexibility while maintaining security best practices.

**Configuration Management:**
- **Port Configuration**: Server port configurable via PORT environment variable (default: 3000)
- **Environment Detection**: NODE_ENV variable for development/production environment detection
- **Logging Configuration**: There is no log-level control — no module reads a `LOG_LEVEL` variable, and nothing filters records by severity. `NODE_ENV` is the only setting that changes logging output: the logger prefixes each line with `[INFO]:` or `[ERROR]:` when it is `development` and omits the prefix otherwise. `ENABLE_LOGGING` gates only the startup configuration summary, not request logging
- **Default Values**: Comprehensive default configuration ensures application runs without external configuration

**Configuration Security:**
- No sensitive configuration values in the tutorial scope
- Configuration is total-defaulting rather than validating: every setting the application reads has a literal fallback, so startup never fails for want of an environment variable. What the configuration module performs at load is narrower than validation — one advisory `console.warn` when the derived port falls outside 1024-65535, which does not prevent the bind, and an `APP_NAME` presence check that no supported input can reach, because a non-empty default is substituted before the check runs. No other environment value is validated
- Configuration documentation for operational teams
- Secure default values that don't expose sensitive information

**Deployment Flexibility:**
The configuration approach supports various deployment scenarios from local development to container orchestration platforms, enabling seamless promotion through development, staging, and production environments without code changes.

---

This system architecture overview provides a comprehensive foundation for understanding the Node.js tutorial application's design principles, component interactions, and architectural decisions. The design emphasizes educational clarity while demonstrating production-ready patterns that can be extended for more complex applications as requirements evolve.