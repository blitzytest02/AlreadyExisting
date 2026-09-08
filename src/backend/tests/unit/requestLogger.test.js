// Request Logger Middleware Unit Test Suite
// Jest Testing Framework - Version: 29.7.0

// Module under test - default export, an Express middleware function
const requestLogger = require('../../middleware/requestLogger');

// The shared logger object the middleware captured at load time. Spying on this
// same object's properties is what lets the assertions read the values logged.
const { logger } = require('../../utils/logger');

/**
 * Request Logger Middleware Unit Tests
 *
 * These are function-level unit tests: the middleware is invoked directly with
 * plain request/response objects and a jest.fn() for next(), with no HTTP driver.
 * requestLogger reads only req.method, req.originalUrl and req.body and never
 * touches the response, so Supertest would add nothing but indirection here.
 *
 * The suite asserts the value the logger actually received - not merely that the
 * middleware ran - because the whole point of this module is the record it emits.
 * All four body-handling paths are covered:
 *   1. object body      -> serialised with JSON.stringify
 *   2. primitive body   -> coerced with String()
 *   3. absent body      -> rendered as '{}' (both undefined and null)
 *   4. circular body    -> '[Object - Unable to serialize]' plus a logger.error call
 *
 * Requirements Addressed:
 * - F-003: Request Processing (per-request observability)
 * - Basic error handling and logging (Core Features and Functionalities)
 */
describe('requestLogger middleware', () => {
  let infoSpy;
  let errorSpy;
  let next;

  beforeEach(() => {
    // Silence the real console writes while capturing the arguments they receive
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    next = jest.fn();
  });

  afterEach(() => {
    // Restore the genuine logger functions so no state leaks between suites
    jest.restoreAllMocks();
  });

  /**
   * Builds a minimal request stand-in. Only the three fields the middleware
   * reads are provided; anything else would be dead weight in the fixture.
   */
  const buildRequest = (method, originalUrl, body) => ({
    method,
    originalUrl,
    body
  });

  it('should log an object body serialized as JSON and call next()', () => {
    const req = buildRequest('POST', '/hello', { name: 'John', nested: { id: 7 } });

    requestLogger(req, {}, next);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'POST',
      'Path:',
      '/hello',
      'Body:',
      '{"name":"John","nested":{"id":7}}'
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should log a primitive body coerced to a string and call next()', () => {
    const req = buildRequest('PUT', '/hello?verbose=1', 42);

    requestLogger(req, {}, next);

    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'PUT',
      'Path:',
      '/hello?verbose=1',
      'Body:',
      '42'
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should log an absent body as '{}' for both undefined and null", () => {
    // undefined body - the normal case for GET, since no body parser is mounted
    requestLogger(buildRequest('GET', '/hello', undefined), {}, next);

    // null body - the second half of the guard's short-circuit
    requestLogger(buildRequest('HEAD', '/hello', null), {}, next);

    expect(infoSpy).toHaveBeenNthCalledWith(
      1,
      'HTTP Request -',
      'Method:',
      'GET',
      'Path:',
      '/hello',
      'Body:',
      '{}'
    );
    expect(infoSpy).toHaveBeenNthCalledWith(
      2,
      'HTTP Request -',
      'Method:',
      'HEAD',
      'Path:',
      '/hello',
      'Body:',
      '{}'
    );
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should report an unserializable body without throwing and still call next()', () => {
    // A circular reference makes JSON.stringify throw, exercising the catch branch
    const circular = { label: 'circular' };
    circular.self = circular;
    const req = buildRequest('POST', '/hello', circular);

    expect(() => requestLogger(req, {}, next)).not.toThrow();

    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'POST',
      'Path:',
      '/hello',
      'Body:',
      '[Object - Unable to serialize]'
    );

    // The serialization failure is reported, with the path, for debugging
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Request body serialization failed:',
      expect.any(String),
      'for path:',
      '/hello'
    );

    // A logging failure must never break the request-response cycle
    expect(next).toHaveBeenCalledTimes(1);
  });
});
