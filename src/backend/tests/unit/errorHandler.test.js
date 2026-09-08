// Error Handler Middleware Unit Test Suite
// Jest Testing Framework - Version: 29.7.0

// Module under test - NAMED export, a four-arity Express error middleware
const { errorHandler } = require('../../middleware/errorHandler');

// The shared logger object the middleware captured at load time
const { logger } = require('../../utils/logger');

/**
 * Error Handler Middleware Unit Tests
 *
 * errorHandler is the application's terminal middleware: Express routes to it
 * only when it is registered after every router, and it deliberately does not
 * call next(), because it ends the request-response cycle by sending the
 * response.
 *
 * The handler is invoked directly here. That is deliberate rather than a
 * shortcut: no route in the application throws or calls next(err), so there is
 * no HTTP request that would reach it, and adding a throwing route purely to
 * test it would add an endpoint the application is not meant to have. These
 * tests are therefore the only executable evidence for this module's behaviour.
 *
 * Fixture note: the handler reads req.get('User-Agent') on every invocation,
 * so the request stand-in MUST provide `get`. Omitting it throws
 * "TypeError: req.get is not a function" from inside the handler, before any
 * response assertion runs - a failure that looks like a handler bug but is not.
 *
 * Requirements Addressed:
 * - F-001-RQ-004: Graceful error handling
 * - Basic error handling and logging (Core Features and Functionalities)
 */
describe('errorHandler middleware', () => {
  let errorSpy;
  let res;
  let next;

  beforeEach(() => {
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    // status() must be chainable in Express; json() terminates the response
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Fully-populated request stand-in: originalUrl and ip are present, so the
   * left-hand side of each of the handler's fallback expressions is taken.
   */
  const buildRequest = () => ({
    method: 'GET',
    originalUrl: '/hello',
    url: '/hello-raw',
    headers: { host: 'localhost:3000' },
    params: {},
    query: {},
    ip: '127.0.0.1',
    connection: { remoteAddress: '10.0.0.1' },
    get: jest.fn(() => 'jest-test-agent')
  });

  it('should respond 500 with the generic error envelope', () => {
    const req = buildRequest();
    const err = new Error('Something went wrong');

    errorHandler(err, req, res, next);

    // Status is set before the body is sent
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);

    // The envelope is generic on purpose - it must not leak err.message or
    // the stack. Matching the whole object rather than a subset is what makes
    // this assert "exactly these four fields": a fifth would fail here.
    // The timestamp is pinned to the shape new Date().toISOString() produces
    // rather than to any string, so a malformed value cannot slip through.
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toEqual({
      error: 'Internal Server Error',
      status: 500,
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      ),
      path: '/hello'
    });
    expect(JSON.stringify(payload)).not.toContain('Something went wrong');

    // The full detail goes to the log instead, where it is safe to expose
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled application error occurred:',
      expect.objectContaining({
        errorMessage: 'Something went wrong',
        errorName: 'Error',
        errorStack: expect.any(String),
        requestUrl: '/hello',
        requestMethod: 'GET',
        userAgent: 'jest-test-agent',
        clientIP: '127.0.0.1'
      })
    );
    expect(req.get).toHaveBeenCalledWith('User-Agent');
  });

  it('should terminate the middleware chain without calling next()', () => {
    errorHandler(new Error('terminal'), buildRequest(), res, next);

    // Calling next() after a response has been sent would hand control to
    // middleware that can no longer write, so the handler must not do it
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it('should fall back to req.url and connection.remoteAddress', () => {
    // Exercises the right-hand side of every fallback expression: no
    // originalUrl and no ip, so req.url and connection.remoteAddress are the
    // only values the handler can reach.
    const req = {
      method: 'POST',
      url: '/raw-path',
      headers: {},
      params: {},
      query: {},
      connection: { remoteAddress: '192.168.1.50' },
      get: jest.fn(() => 'fallback-test-agent')
    };

    errorHandler(new Error('fallback path'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);

    // path uses the same originalUrl || url expression as the log record, so
    // the fallback has to surface in the client response too
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Internal Server Error',
        path: '/raw-path'
      })
    );

    // The logged record must carry the fallback values themselves, not merely
    // prove that a 500 came back. userAgent is asserted against the string the
    // req.get stand-in returns, which is what shows the handler consumed it.
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled application error occurred:',
      expect.objectContaining({
        requestUrl: '/raw-path',
        clientIP: '192.168.1.50',
        userAgent: 'fallback-test-agent'
      })
    );
    expect(req.get).toHaveBeenCalledWith('User-Agent');
    expect(next).not.toHaveBeenCalled();
  });
});
