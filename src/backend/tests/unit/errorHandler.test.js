// Module under test - NAMED export, a four-arity Express error middleware
const { errorHandler } = require('../../middleware/errorHandler');

// The same logger object the middleware captured at load time: Node keys the
// module cache by resolved path, so a spy installed here is observed inside
// the handler. Spying at this level rather than on console also keeps the
// assertions independent of the '[ERROR]:' prefix logger.js adds in
// development.
const { logger } = require('../../utils/logger');

// The same config singleton the middleware reads. config/index.js exports a
// plain mutable object and the handler reads config.nodeEnv at invocation
// time, so assigning to it here is what lets one suite exercise both sides of
// the environment gate. afterEach puts the original value back.
const config = require('../../config');

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
 * Two contracts are asserted, and they are alike rather than opposed. The
 * client response is generic - four fields, no error message and no stack. The
 * log record is wider, because it exists to make an error reproducible, but it
 * is not unfiltered: request headers pass through a redacting allow-list, so a
 * credential-bearing header contributes its NAME and the literal '[REDACTED]'
 * rather than its value, and the stack trace - whose every frame names an
 * absolute host filesystem path - is recorded only when NODE_ENV is
 * development. The record assertion below matches the whole context object
 * precisely, so a field that stopped being redacted would fail here rather
 * than pass unnoticed; the fixtures plant credential values specifically so
 * that their absence from the record is asserted rather than assumed.
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
 * - Least-privilege logging: no credential-bearing header value and no
 *   internal filesystem path is written to a non-development log
 */
describe('errorHandler middleware', () => {
  let errorSpy;
  let res;
  let next;

  // The shape new Date().toISOString() produces, so a malformed timestamp
  // cannot pass where any string would
  const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  // Recorded in place of any header value outside the allow-list, and in place
  // of the stack outside development. Kept as literals here rather than
  // imported: the suite asserts the contract the module publishes, so a change
  // to either marker must be a visible change to these expectations.
  const REDACTED = '[REDACTED]';
  const STACK_OMITTED = '[stack omitted outside development]';

  // Jest sets NODE_ENV to 'test', so config.nodeEnv is 'test' unless a case
  // changes it - which means the default for every case is the gated,
  // non-development branch
  const ORIGINAL_NODE_ENV = config.nodeEnv;

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

    // config is a shared singleton, so a case that moved the environment must
    // put it back or it leaks into every case that follows
    config.nodeEnv = ORIGINAL_NODE_ENV;
  });

  /**
   * Fully-populated request: originalUrl and ip are both present, so each of
   * the handler's three fallback expressions takes its left-hand side. The
   * header bag deliberately mixes two allow-listed headers with two
   * credential carriers, so the primary record assertion is also the
   * redaction assertion.
   */
  const buildRequest = () => ({
    method: 'GET',
    originalUrl: '/hello?page=2',
    url: '/hello',
    headers: {
      host: 'localhost:3000',
      'content-type': 'application/json',
      authorization: 'Bearer super-secret-token',
      cookie: 'session=super-secret-session'
    },
    params: {},
    query: { page: '2' },
    ip: '203.0.113.7',
    connection: { remoteAddress: '198.51.100.4' },
    get: jest.fn(() => 'jest-runner/1.0')
  });

  it('should respond 500 and log a redacted request context', () => {
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
    // here - which is also what documents the record's exact contents.
    //
    // Note the two fields the least-privilege rules govern. requestHeaders is
    // NOT req.headers: it is a new object in which host and content-type keep
    // their values because the allow-list names them, while authorization and
    // cookie keep only their names. errorStack is the marker rather than the
    // trace, because Jest runs with NODE_ENV=test and the gate admits
    // development alone.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled application error occurred:',
      {
        errorMessage: 'Something went wrong',
        errorStack: STACK_OMITTED,
        errorName: 'Error',
        requestUrl: '/hello?page=2',
        requestMethod: 'GET',
        requestHeaders: {
          host: 'localhost:3000',
          'content-type': 'application/json',
          authorization: REDACTED,
          cookie: REDACTED
        },
        requestParams: req.params,
        requestQuery: req.query,
        timestamp: expect.stringMatching(ISO_TIMESTAMP),
        userAgent: 'jest-runner/1.0',
        clientIP: '203.0.113.7'
      }
    );

    // Asserted on the serialized record as well as on its shape: the values
    // the fixture planted must appear nowhere in the log at all, which is the
    // property a caller's credentials actually depend on
    const record = JSON.stringify(errorSpy.mock.calls[0][1]);
    expect(record).not.toContain('super-secret-token');
    expect(record).not.toContain('super-secret-session');

    // Proves the mandatory fixture member was actually consumed
    expect(req.get).toHaveBeenCalledWith('User-Agent');
  });

  it('should redact every header outside the allow-list', () => {
    // A header nobody enumerated is the case a deny-list of known credential
    // names would miss, so the fixture carries one alongside the familiar
    // ones. Header names arrive lower-cased from Node, and a mixed-case name
    // from a hand-built request is normalised before the allow-list is
    // consulted rather than falling through it.
    const req = {
      method: 'POST',
      originalUrl: '/hello',
      url: '/hello',
      headers: {
        host: 'localhost:3000',
        'User-Agent': 'curl/8.14.1',
        accept: 'application/json',
        'content-length': '0',
        authorization: 'Bearer leaked-if-unredacted',
        cookie: 'session=leaked-if-unredacted',
        'proxy-authorization': 'Basic leaked-if-unredacted',
        'x-api-key': 'leaked-if-unredacted',
        'x-custom-token': 'leaked-if-unredacted',
        referer: 'https://example.test/page?token=leaked-if-unredacted'
      },
      params: {},
      query: {},
      ip: '203.0.113.7',
      connection: { remoteAddress: '198.51.100.4' },
      get: jest.fn(() => 'curl/8.14.1')
    };

    errorHandler(new Error('boom'), req, res, next);

    const record = errorSpy.mock.calls[0][1];

    // Every name survives, so an operator can still see what was sent
    expect(Object.keys(record.requestHeaders)).toEqual(
      Object.keys(req.headers)
    );

    // Allow-listed values pass through unchanged, including the mixed-case name
    expect(record.requestHeaders.host).toBe('localhost:3000');
    expect(record.requestHeaders['User-Agent']).toBe('curl/8.14.1');
    expect(record.requestHeaders.accept).toBe('application/json');
    expect(record.requestHeaders['content-length']).toBe('0');

    // Everything else is reduced to the marker - the named credential
    // carriers, a bespoke header, and referer, whose query string is a
    // routine place for a token to hide
    expect(record.requestHeaders.authorization).toBe(REDACTED);
    expect(record.requestHeaders.cookie).toBe(REDACTED);
    expect(record.requestHeaders['proxy-authorization']).toBe(REDACTED);
    expect(record.requestHeaders['x-api-key']).toBe(REDACTED);
    expect(record.requestHeaders['x-custom-token']).toBe(REDACTED);
    expect(record.requestHeaders.referer).toBe(REDACTED);

    // One assertion for the whole property: the sentinel value appears in six
    // different headers and in none of the record
    expect(JSON.stringify(record)).not.toContain('leaked-if-unredacted');

    // Redaction builds a new object; the live request is not rewritten, since
    // later middleware and the response path may still read it
    expect(req.headers.authorization).toBe('Bearer leaked-if-unredacted');
  });

  it('should record the stack only in development', () => {
    const err = new Error('Something went wrong');

    // Outside development - the default here, since Jest sets NODE_ENV=test
    errorHandler(err, buildRequest(), res, next);
    expect(errorSpy.mock.calls[0][1].errorStack).toBe(STACK_OMITTED);

    // A stack frame names an absolute path, so nothing resembling one may
    // reach the record when the gate is closed
    expect(JSON.stringify(errorSpy.mock.calls[0][1])).not.toContain('at ');

    // In development the trace is recorded in full, which is the whole point
    // of gating rather than dropping it
    config.nodeEnv = 'development';
    errorHandler(err, buildRequest(), res, next);

    const developmentStack = errorSpy.mock.calls[1][1].errorStack;
    expect(developmentStack).toBe(err.stack);
    expect(developmentStack).toContain('Error: Something went wrong');

    // The message and name are ungated, so an error stays diagnosable in
    // production even with the trace withheld
    expect(errorSpy.mock.calls[0][1].errorMessage).toBe(
      'Something went wrong'
    );
    expect(errorSpy.mock.calls[0][1].errorName).toBe('Error');
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

  it('should still respond when the request carries no header bag', () => {
    // A four-arity handler has nowhere to forward an error of its own, so it
    // must not throw. A request stand-in with no headers would make the
    // sanitiser's Object.keys throw if it were not guarded, and the guard
    // yields an empty record rather than a failed response.
    const req = {
      method: 'GET',
      originalUrl: '/hello',
      url: '/hello',
      params: {},
      query: {},
      ip: '203.0.113.7',
      connection: { remoteAddress: '198.51.100.4' },
      get: jest.fn(() => 'jest-runner/1.0')
    };

    expect(() =>
      errorHandler(new Error('boom'), req, res, next)
    ).not.toThrow();

    expect(errorSpy.mock.calls[0][1].requestHeaders).toEqual({});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal Server Error' })
    );
  });
});
