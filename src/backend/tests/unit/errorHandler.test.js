// Module under test - NAMED export, a four-arity Express error middleware
const { errorHandler } = require('../../middleware/errorHandler');

// The same logger object the middleware captured at load time: Node keys the
// module cache by resolved path, so a spy installed here is observed inside
// the handler. Spying at this level rather than on console also keeps the
// assertions independent of the '[ERROR]:' prefix logger.js adds in
// development.
const { logger } = require('../../utils/logger');

/**
 * Error Handler Middleware Unit Tests
 *
 * errorHandler is the application's terminal middleware. Express routes to a
 * four-argument handler only when it is registered after every router, and
 * this one ends the request-response cycle by sending the response: it never
 * calls next() and never inspects res.headersSent.
 *
 * The handler is invoked directly here. No route in the application throws or
 * calls next(err), so no HTTP request reaches it, and adding a throwing route
 * to reach one would introduce an endpoint the application is not meant to
 * have. These cases are therefore the only executable evidence for this
 * module's behaviour.
 *
 * The two contracts asserted differ in kind, deliberately. The client response
 * is generic - four fields, no error message and no stack. The log record is
 * the opposite: it carries the stack, the request target as received, every
 * request header, the route parameters and query, the User-Agent and the
 * client address, none of them redacted, filtered or transformed. The record
 * assertion below matches the whole context object precisely so that this
 * residual exposure is visible in the suite rather than implied by it; no
 * fixture plants a secret, because nothing here would remove one.
 *
 * Fixture notes. The handler calls req.get('User-Agent') on every invocation,
 * so the request stand-in MUST provide get - omitting it throws
 * "TypeError: req.get is not a function" from inside the handler, before any
 * response assertion runs, and the failure then looks like a handler defect
 * rather than a fixture one. The client-address fallback reads
 * req.connection.remoteAddress, Node's deprecated alias for req.socket, so the
 * fixtures supply connection: they mirror the module under test rather than
 * the modern spelling it does not use.
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
  // cannot pass where any string would
  const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  beforeEach(() => {
    // clearMocks in jest.config.js clears call history but leaves a spy's
    // replacement implementation installed, so each case installs its own and
    // afterEach restores it
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    // status() and json() are separate statements in the handler rather than a
    // chain, but returning res keeps the mocks usable either way
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
   * Fully-populated request: originalUrl and ip are both present, so each of
   * the handler's three fallback expressions takes its left-hand side.
   */
  const buildRequest = () => ({
    method: 'GET',
    originalUrl: '/hello?page=2',
    url: '/hello',
    headers: { host: 'localhost:3000', 'content-type': 'application/json' },
    params: {},
    query: { page: '2' },
    ip: '203.0.113.7',
    connection: { remoteAddress: '198.51.100.4' },
    get: jest.fn(() => 'jest-runner/1.0')
  });

  it('should respond 500 and log the request context as received', () => {
    const req = buildRequest();

    errorHandler(new Error('Something went wrong'), req, res, next);

    // Status is set before the body is sent
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);

    // Matching the whole object rather than a subset is what makes this assert
    // "exactly these four fields": a fifth would fail here
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      status: 500,
      timestamp: expect.stringMatching(ISO_TIMESTAMP),
      path: '/hello?page=2'
    });

    // The message and the stack stay server-side, in the record below
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(
      'Something went wrong'
    );

    // Two arguments: a fixed prefix and one context object. All eleven of its
    // fields are matched, so a removed, renamed or newly added field fails
    // here - which is also what documents the record's exact contents. Note
    // requestHeaders: the headers object is recorded whole, so every header
    // the caller sent is in the log, and requestUrl carries the query string.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled application error occurred:',
      {
        errorMessage: 'Something went wrong',
        errorStack: expect.any(String),
        errorName: 'Error',
        requestUrl: '/hello?page=2',
        requestMethod: 'GET',
        requestHeaders: req.headers,
        requestParams: req.params,
        requestQuery: req.query,
        timestamp: expect.stringMatching(ISO_TIMESTAMP),
        userAgent: 'jest-runner/1.0',
        clientIP: '203.0.113.7'
      }
    );

    // Proves the mandatory fixture member was actually consumed
    expect(req.get).toHaveBeenCalledWith('User-Agent');
  });

  it('should terminate the chain without calling next()', () => {
    errorHandler(new Error('Something went wrong'), buildRequest(), res, next);

    // The handler ends the cycle by responding. Calling next() afterwards
    // would hand a completed response to middleware that can no longer write
    // to it, which is why the module omits the call deliberately.
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('should fall back to req.url and the connection address', () => {
    // Neither originalUrl nor ip is present, so all three fallback
    // expressions take their right-hand side
    const req = {
      method: 'POST',
      url: '/fallback-path',
      headers: {},
      params: { id: '42' },
      query: {},
      connection: { remoteAddress: '198.51.100.4' },
      get: jest.fn(() => 'jest-runner/1.0')
    };

    errorHandler(new Error('boom'), req, res, next);

    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled application error occurred:',
      expect.objectContaining({
        requestUrl: '/fallback-path',
        clientIP: '198.51.100.4'
      })
    );

    // The envelope's path is the same req.originalUrl || req.url expression,
    // so the fallback has to surface there too
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/fallback-path' })
    );
  });
});
