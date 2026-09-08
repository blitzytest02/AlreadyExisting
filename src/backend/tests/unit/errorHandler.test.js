// Error Handler Middleware Unit Test Suite
// Jest Testing Framework - Version: 29.7.0

// Module under test - NAMED export, a four-arity Express error middleware
const { errorHandler } = require('../../middleware/errorHandler');

// The shared logger object the middleware captured at load time
const { logger } = require('../../utils/logger');

// The application configuration, whose nodeEnv decides whether the handler may
// write a stack trace. It is a plain object, so a case can set it and put it
// back afterwards.
const config = require('../../config');

/**
 * Error Handler Middleware Unit Tests
 *
 * errorHandler is the application's terminal middleware: Express routes to it
 * only when it is registered after every router, and it ends the
 * request-response cycle by sending the response instead of calling next().
 * The one exception is a response that has already started, where Express
 * requires delegation to its own default handler - covered below.
 *
 * The handler is invoked directly here. That is deliberate rather than a
 * shortcut: no route in the application throws or calls next(err), so there is
 * no HTTP request that would reach it, and adding a throwing route purely to
 * test it would add an endpoint the application is not meant to have. These
 * tests are therefore the only executable evidence for this module's behaviour.
 *
 * Two contracts are asserted. The client response is generic: four fields, no
 * error message, no stack, and a path with the query string dropped. The log
 * record is complete in shape - all eleven fields, every one asserted - and
 * minimized in content: nothing the caller supplied appears in it, neither
 * values nor NAMES, so the fixtures plant a marker string in the query, in a
 * plausible-looking custom header, in the User-Agent and in the client address
 * and assert that marker reaches none of the logger's arguments. What remains
 * is operator-facing diagnostic material, which is not safe by virtue of
 * sitting in a log: whoever runs this application still has to control access
 * to it and bound its retention.
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

  // The shape new Date().toISOString() produces, so a malformed timestamp
  // cannot slip through where any string would
  const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  // Planted wherever the request can carry caller-supplied text
  const SECRET = 'PLANTED-SECRET-VALUE';

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
    // clearMocks in jest.config.js clears call history but leaves the spy's
    // replacement implementation installed, so restoring is not redundant
    jest.restoreAllMocks();
  });

  /**
   * Fully-populated request stand-in: originalUrl and ip are present, so the
   * left-hand side of each of the handler's fallback expressions is taken.
   * The query string, the route parameter, the custom headers, the User-Agent
   * and the client address all carry material the record must not reproduce.
   */
  const buildRequest = () => ({
    method: 'GET',
    originalUrl: `/hello?token=${SECRET}&${SECRET}=1`,
    url: '/hello-raw',
    headers: {
      host: 'localhost:3000',
      'content-type': 'application/json',
      authorization: `Bearer ${SECRET}`,
      'x-auth': SECRET,
      [`x-${SECRET}`]: 'anything'
    },
    params: { id: '42' },
    query: { token: SECRET, [SECRET]: '1' },
    ip: '203.0.113.7',
    connection: { remoteAddress: '10.0.0.1' },
    get: jest.fn(() => `agent-${SECRET}`)
  });

  /** Everything the logger was handed, rendered for absence assertions */
  const everythingLogged = () =>
    errorSpy.mock.calls
      .map((call) => call.map((argument) => JSON.stringify(argument)).join(' '))
      .join(' | ');

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
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toEqual({
      error: 'Internal Server Error',
      status: 500,
      timestamp: expect.stringMatching(ISO_TIMESTAMP),
      path: '/hello?[REDACTED]'
    });
    expect(JSON.stringify(payload)).not.toContain('Something went wrong');

    // The path is reflected back to the caller, so nothing the caller put in
    // the URL - value or parameter name - may survive in it
    expect(JSON.stringify(payload)).not.toContain(SECRET);
  });

  it('should log the complete context with nothing the caller supplied', () => {
    const req = buildRequest();
    const err = new Error('Something went wrong');

    errorHandler(err, req, res, next);

    // Every one of the eleven fields is asserted, and the whole object is
    // matched rather than a subset, so removing, renaming or corrupting any
    // field fails here - this suite is the only executable check on the record
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [logMessage, context] = errorSpy.mock.calls[0];
    expect(logMessage).toBe('Unhandled application error occurred:');
    expect(context).toStrictEqual({
      errorMessage: 'Something went wrong',
      errorStack: expect.any(String),
      errorName: 'Error',
      requestUrl: '/hello?[REDACTED]',
      requestMethod: 'GET',
      // Allowlisted protocol metadata survives with its value; the three
      // other headers are dropped whole, name included, and counted
      requestHeaders: {
        host: 'localhost:3000',
        'content-type': 'application/json',
        '[redacted]': 3
      },
      requestParams: { '[redacted]': 1 },
      requestQuery: { '[redacted]': 2 },
      timestamp: expect.stringMatching(ISO_TIMESTAMP),
      userAgent: '[REDACTED]',
      clientIP: '203.0.113.[REDACTED]'
    });

    // The planted marker arrived in the query values, a query name, a header
    // value, a header name, the User-Agent and nowhere may it reappear
    expect(everythingLogged()).not.toContain(SECRET);
    expect(everythingLogged()).not.toContain('203.0.113.7');
    expect(req.get).toHaveBeenCalledWith('User-Agent');
  });

  it('should withhold the stack trace in production', () => {
    // The stack exposes absolute filesystem paths and internal structure, so
    // it is written while developing and withheld once the same log may be
    // shipped off the host. The key stays present either way.
    const originalNodeEnv = config.nodeEnv;
    config.nodeEnv = 'production';

    try {
      errorHandler(new Error('production failure'), buildRequest(), res, next);
    } finally {
      config.nodeEnv = originalNodeEnv;
    }

    const [, context] = errorSpy.mock.calls[0];
    expect(context.errorStack).toBe('[REDACTED]');
    expect(context.errorMessage).toBe('production failure');
    expect(everythingLogged()).not.toContain('errorHandler.js');
  });

  it('should terminate the middleware chain without calling next()', () => {
    errorHandler(new Error('terminal'), buildRequest(), res, next);

    // Calling next() after a response has been sent would hand control to
    // middleware that can no longer write, so the handler must not do it
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it('should delegate to the default handler once headers are sent', () => {
    // Express's contract for an error raised after the response has started:
    // the handler cannot set a status or send a body, and must hand the
    // request to the framework's own handler, which closes the connection.
    // Writing anyway raises ERR_HTTP_HEADERS_SENT and loses the real error.
    const err = new Error('failed mid-response');
    const req = {
      method: 'GET',
      originalUrl: '/hello?',
      headers: null,
      params: {},
      query: {},
      connection: {},
      get: jest.fn(() => undefined)
    };
    res.headersSent = true;

    errorHandler(err, req, res, next);

    // The original error is passed on, not swallowed or replaced
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(err);

    // No second write is attempted against the started response
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // The error is still recorded before the handoff. A bare '?' leaves the
    // pathname alone; headers Express never populated and a request with no
    // address at all render as fixed values rather than as 'undefined'; and a
    // missing User-Agent is recorded as absent rather than as redacted.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled application error occurred:',
      expect.objectContaining({
        errorMessage: 'failed mid-response',
        requestUrl: '/hello',
        requestHeaders: {},
        requestParams: {},
        requestQuery: {},
        userAgent: '[absent]',
        clientIP: '[REDACTED]'
      })
    );
  });

  it('should fall back to req.url and connection.remoteAddress', () => {
    // Exercises the right-hand side of every fallback expression: no
    // originalUrl and no ip, so req.url and connection.remoteAddress are the
    // only values the handler can reach. An IPv6 address keeps its first two
    // groups, which also masks the embedded address of an IPv4-mapped form.
    const req = {
      method: 'POST',
      url: '/raw-path',
      headers: undefined,
      params: null,
      query: { one: '1' },
      connection: { remoteAddress: `::ffff:192.168.1.50` },
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
    // prove that a 500 came back
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled application error occurred:',
      expect.objectContaining({
        requestUrl: '/raw-path',
        requestHeaders: {},
        requestParams: {},
        requestQuery: { '[redacted]': 1 },
        userAgent: '[REDACTED]',
        clientIP: '::[REDACTED]'
      })
    );
    expect(everythingLogged()).not.toContain('192.168.1.50');
    expect(everythingLogged()).not.toContain('fallback-test-agent');
    expect(req.get).toHaveBeenCalledWith('User-Agent');
    expect(next).not.toHaveBeenCalled();
  });
});
