# API Reference: GET /hello

## Overview

This document provides comprehensive details for the `/hello` API endpoint. This endpoint serves as a fundamental demonstration of HTTP GET request handling in the Node.js tutorial application, returning a static "Hello world" message to confirm server accessibility and proper routing configuration. It implements the core educational objectives outlined in Feature F-002 of the technical specifications.

---

## Endpoint Details

- **Path:** `/hello`
- **Method:** `GET`
- **Description:** Responds with a static "Hello world" message to demonstrate basic HTTP server functionality and RESTful endpoint implementation.
- **Framework:** Express.js v5.1.0 with Node.js v22.16.0 LTS
- **Purpose:** Educational demonstration of HTTP request-response patterns and Express routing fundamentals

---

## Request Specification

### HTTP Method
- **Declared:** `GET` — the one route declared for this endpoint
- **Derived by Express:** `HEAD` returns `200` with the same headers as `GET` and no response body; `OPTIONS` returns `200` with `Allow: GET, HEAD`. Both are protocol behaviours Express derives from the single `GET` declaration, not additional endpoints
- **Not Routed:** `POST`, `PUT`, `DELETE` and `PATCH` return `404 Not Found`

### Request Parameters
This endpoint does not require any parameters, headers, or request body:
- **Path Parameters:** None
- **Query Parameters:** None  
- **Request Headers:** No specific headers required
- **Request Body:** Not applicable for GET requests

### Request Format
```http
GET /hello HTTP/1.1
Host: localhost:3000
```

---

## Response Specification

### Success Response

- **Status Code:** `200 OK`
- **Content-Type:** `text/html; charset=utf-8`
- **Content-Length:** 11 bytes
- **Response Body:**
```
Hello world
```

### Response Headers
```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 11
Date: [Current Date]
Connection: keep-alive
Keep-Alive: timeout=5
```

### Performance Characteristics
- **Target Response Time:** < 100ms (as per F-002 performance criteria)
- **Typical Response Time:** < 25ms under normal conditions
- **Memory Usage:** Minimal (static response)
- **Processing Overhead:** Negligible

---

## Error Responses

### Method Not Allowed
- **Scenario:** When using `POST`, `PUT`, `DELETE` or `PATCH` on `/hello` (`HEAD` and `OPTIONS` are served successfully and do not produce this response)
- **Status Code:** `404 Not Found`
- **Reason:** Express.js default behavior for unmatched route/method combinations
- **Content-Type:** `text/html; charset=utf-8`
- **Response Body:** 
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /hello</pre>
</body>
</html>
```

### Route Not Found
- **Scenario:** When accessing non-existent paths
- **Status Code:** `404 Not Found`
- **Behavior:** Standard Express 404 error handling

---

## Usage Examples

### Command Line (cURL)

#### Basic Request
```bash
curl http://localhost:3000/hello
```

#### Request with Headers Display
```bash
curl -i http://localhost:3000/hello
```

#### Request with Verbose Output
```bash
curl -v http://localhost:3000/hello
```

### Expected Response
```
Hello world
```

### Web Browser Access
Simply navigate to the following URL in any web browser:
```
http://localhost:3000/hello
```

The browser will display the plain text response "Hello world" directly on the page.

### HTTP Client Tools
- **Postman:** Create a GET request to `http://localhost:3000/hello`
- **Insomnia:** Set method to GET and URL to `http://localhost:3000/hello`
- **HTTPie:** `http GET localhost:3000/hello`

---

## Technical Implementation

### Framework Details
- **Express Version:** 5.1.0 (enhanced promise support)
- **Node.js Version:** v22.16.0 LTS
- **Routing Pattern:** Express Router with modular organization
- **Response Method:** `res.send()` with automatic Content-Type detection

### Code Reference
The endpoint is implemented in `src/backend/routes/hello.js` using Express Router pattern:
```javascript
router.get('/', (req, res) => {
    res.send('Hello world');
});
```

### Requirements Compliance
- **F-002-RQ-001:** ✅ Route definition for `/hello` path with GET method support
- **F-002-RQ-002:** ✅ Returns exact text "Hello world"
- **F-002-RQ-003:** ✅ Declares only the GET HTTP method — `POST`, `PUT`, `DELETE` and `PATCH` return `404`, while Express derives `HEAD` and `OPTIONS` from the same declaration, so both return `200`
- **F-002-RQ-004:** ✅ Includes appropriate Content-Type header (`text/html; charset=utf-8`)

---

## Integration Notes

### Server Mounting
This endpoint router is mounted in the main application at the `/hello` path, making the final accessible URL `GET /hello` when the server runs on the default port 3000.

### Dependencies
- Requires HTTP server initialization (Feature F-001)
- Integrates with Express application instance
- Utilizes Express routing and response handling capabilities

### Educational Value
This endpoint demonstrates:
- Express.js routing fundamentals
- HTTP request-response cycle
- RESTful API endpoint structure
- Modern Node.js development practices
- Production-ready code organization patterns

---

## Testing and Validation

### Functional Testing
- Verify 200 status code response
- Confirm exact "Hello world" response text
- Validate Content-Type header setting
- Test the method matrix: GET, HEAD and OPTIONS return 200; POST, PUT, DELETE and PATCH return 404

### Performance Testing
- Response time should be under 100ms
- Memory usage should remain minimal
- Server should handle concurrent requests efficiently

### Browser Compatibility
- Tested on Chrome, Firefox, Safari, and Edge
- Compatible with all modern web browsers
- No JavaScript required for functionality

---

## Security Considerations

- **Input Validation:** Not applicable (no user input accepted)
- **Authentication:** None required (tutorial endpoint)
- **Authorization:** No access restrictions
- **Data Exposure:** Only static text response, no sensitive data
- **Rate Limiting:** Not implemented (tutorial scope)

---

## Troubleshooting

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Server not running | Connection refused | Start server with `npm start` |
| Wrong port | 404 or connection error | Verify server running on port 3000 |
| Method error | 404 response | Use GET (HEAD and OPTIONS also succeed); POST, PUT, DELETE and PATCH are not routed |
| Network issues | Timeout | Check localhost connectivity |

### Validation Commands
```bash
# Test server accessibility
curl -I http://localhost:3000/hello

# Verify response content
curl -s http://localhost:3000/hello | grep "Hello world"

# Test method restriction
curl -X POST http://localhost:3000/hello
```

---

## Related Documentation

- **Server Setup:** See main README.md for installation and startup instructions
- **Technical Specifications:** Reference TECHNICAL_SPECIFICATIONS.md for detailed requirements
- **Implementation Guide:** Check src/backend/routes/hello.js for code details
- **Testing Guide:** Refer to test suite for validation examples