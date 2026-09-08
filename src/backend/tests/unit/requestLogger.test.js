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
 * These are function-level unit tests: the middleware is invoked directly
 * with plain request/response objects and a jest.fn() for next(), with no
 * HTTP driver. requestLogger reads only req.method, req.originalUrl and
 * req.body and never touches the response, so Supertest would add nothing
 * but indirection here.
 *
 * The suite asserts the value the logger actually received - not merely
 * that the middleware ran - because the whole point of this module is the
 * record it emits. Two properties are covered together.
 *
 * Data minimization. app.js mounts this middleware for every request, so
 * anything it writes is written for every caller. Nothing the caller
 * supplied may appear: not a query value, not a query NAME, not a body
 * value, not a body field NAME, and not text produced by a getter or a
 * toJSON hook the caller planted. Each case below plants a marker string
 * somewhere in the request and asserts that marker appears in none of the
 * arguments handed to logger.info or logger.error.
 *
 * The body-description paths:
 *   1. absent body     -> rendered as '{}' (both undefined and null)
 *   2. primitive body  -> recorded by type as '[<type> - redacted]'
 *   3. object body     -> '[object - N field(s) redacted]', by field count
 *   4. uninspectable   -> '[object - unable to inspect]' plus a logger.error
 *                         call that carries no detail of the failure
 *
 * Requirements Addressed:
 * - F-003: Request Processing (per-request observability)
 * - Basic error handling and logging (Core Features and Functionalities)
 */
describe('requestLogger middleware', () => {
  let infoSpy;
  let errorSpy;
  let next;

  // Planted in every fixture that can carry caller-supplied text, so one
  // assertion covers the whole record rather than a single field
  const SECRET = 'PLANTED-SECRET-VALUE';

  beforeEach(() => {
    // Silence the real console writes while capturing their arguments
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    next = jest.fn();
  });

  afterEach(() => {
    // Restore the genuine logger functions so no state leaks between suites.
    // clearMocks in jest.config.js resets call history but leaves a spy's
    // replacement implementation in place, so this is not redundant.
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

  /**
   * Renders every argument of every recorded call on both spies as one
   * string, so a case can assert a planted secret is absent from the whole
   * record instead of from the single field it happened to check.
   */
  const everythingLogged = () =>
    [...infoSpy.mock.calls, ...errorSpy.mock.calls]
      .map((call) => call.map((argument) => String(argument)).join(' '))
      .join(' | ');

  it('should log a pathname with no body and call next()', () => {
    requestLogger(buildRequest('GET', '/hello', undefined), {}, next);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'GET',
      'Path:',
      '/hello',
      'Body:',
      '{}'
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should drop the whole query string, names included', () => {
    // req.originalUrl carries the query string. A secret can arrive as a
    // value, as a parameter NAME, or as a bare parameter with no '=' at all,
    // so the query is dropped entire and only its presence is recorded.
    const req = buildRequest(
      'GET',
      `/hello?token=${SECRET}&${SECRET}=1&${SECRET}`,
      undefined
    );

    requestLogger(req, {}, next);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'GET',
      'Path:',
      '/hello?[REDACTED]',
      'Body:',
      '{}'
    );
    expect(everythingLogged()).not.toContain(SECRET);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should log a trailing question mark as the pathname alone', () => {
    // '?' with no parameters after it carried nothing to record
    requestLogger(buildRequest('GET', '/hello?', undefined), {}, next);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'GET',
      'Path:',
      '/hello',
      'Body:',
      '{}'
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should record a primitive body by type and not by value', () => {
    const req = buildRequest('PUT', '/hello', `number-${SECRET}`);

    requestLogger(req, {}, next);

    // Exactly one record per request - a duplicate write is a defect too
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'PUT',
      'Path:',
      '/hello',
      'Body:',
      '[string - redacted]'
    );
    expect(everythingLogged()).not.toContain(SECRET);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should describe an object body by field count only', () => {
    // Values, field names and nesting are all caller-supplied, so none of
    // them is rendered - only how many fields arrived
    const req = buildRequest('POST', '/hello', {
      name: SECRET,
      [`field-${SECRET}`]: 'x',
      nested: { id: SECRET },
      note: null
    });

    requestLogger(req, {}, next);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'POST',
      'Path:',
      '/hello',
      'Body:',
      '[object - 4 field(s) redacted]'
    );
    expect(everythingLogged()).not.toContain(SECRET);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should not invoke toJSON, getters or unbox wrapper objects', () => {
    // Three ways a body can hand the logger caller-controlled text if it is
    // serialized or read: a root toJSON hook, a boxed primitive that
    // JSON.stringify would unbox, and a getter that returns or throws it.
    // The middleware counts keys and reads no value, so none of them fires.
    const withToJson = {
      toJSON: () => `tojson-${SECRET}`,
      keep: 1
    };
    const boxed = new String(`boxed-${SECRET}`);
    const withThrowingGetter = {
      get exploding() {
        throw new Error(`getter-${SECRET}`);
      }
    };

    requestLogger(buildRequest('POST', '/hello', withToJson), {}, next);
    requestLogger(buildRequest('POST', '/hello', boxed), {}, jest.fn());
    requestLogger(
      buildRequest('POST', '/hello', withThrowingGetter),
      {},
      jest.fn()
    );

    expect(infoSpy).toHaveBeenCalledTimes(3);
    expect(infoSpy.mock.calls[0][6]).toBe('[object - 2 field(s) redacted]');
    // A boxed primitive's own enumerable keys are its character indices
    expect(infoSpy.mock.calls[1][6]).toBe(
      `[object - ${boxed.length} field(s) redacted]`
    );
    expect(infoSpy.mock.calls[2][6]).toBe('[object - 1 field(s) redacted]');
    expect(everythingLogged()).not.toContain(SECRET);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should log an absent body as '{}' for both undefined and null", () => {
    // A callback of its own per invocation. An aggregate count of two would
    // stay green if one operand of the guard called next() twice while the
    // other never called it, so each handoff is proved separately.
    const nextForUndefined = jest.fn();
    const nextForNull = jest.fn();

    // undefined body - the normal case for GET, since no body parser is mounted
    requestLogger(
      buildRequest('GET', '/hello', undefined),
      {},
      nextForUndefined
    );

    // null body - the second half of the guard's short-circuit
    requestLogger(buildRequest('HEAD', '/hello', null), {}, nextForNull);

    // One record per invocation, and both must render the body as '{}'
    expect(infoSpy).toHaveBeenCalledTimes(2);
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
    expect(errorSpy).not.toHaveBeenCalled();
    expect(nextForUndefined).toHaveBeenCalledTimes(1);
    expect(nextForNull).toHaveBeenCalledTimes(1);
  });

  it('should report an uninspectable body and still call next()', () => {
    // A Proxy whose ownKeys trap throws cannot even be counted. The thrown
    // message is caller-influenced text, so the failure is reported without
    // it: the error record carries the pathname and nothing else.
    const uninspectable = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error(`ownkeys-${SECRET}`);
        }
      }
    );
    const req = buildRequest('POST', `/hello?${SECRET}=1`, uninspectable);

    expect(() => requestLogger(req, {}, next)).not.toThrow();

    // The fallback marker is logged in place of any description
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'POST',
      'Path:',
      '/hello?[REDACTED]',
      'Body:',
      '[object - unable to inspect]'
    );

    // This is the one path that performs two synchronous writes: this error
    // record and the request record above
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Request body inspection failed for path:',
      '/hello?[REDACTED]'
    );
    expect(everythingLogged()).not.toContain(SECRET);

    // A body inspection failure must not prevent the next() handoff. A logger
    // that itself threw would still break the cycle - the middleware does not
    // guard against that, and this case does not claim it does.
    expect(next).toHaveBeenCalledTimes(1);
  });
});
