// Module under test - default export, an Express middleware function
const requestLogger = require('../../middleware/requestLogger');

// The same logger object the middleware captured at load time: Node keys the
// module cache by resolved path, so a spy installed here is observed inside
// the middleware. Spying at this level rather than on console also keeps the
// assertions independent of the '[INFO]:' prefix logger.js adds in development.
const { logger } = require('../../utils/logger');

/**
 * Request Logger Middleware Unit Tests
 *
 * Function-level tests: the middleware is invoked directly with plain
 * request/response objects and a jest.fn() for next(), because it reads only
 * req.method, req.originalUrl and req.body and never touches the response.
 *
 * Each case asserts the values the logger received rather than merely that the
 * middleware ran, since the record it emits is the whole purpose of the module.
 * That record is diagnostic rather than minimized, and these cases show it: the
 * request target is logged exactly as received, query string included, and an
 * object body is logged as its JSON serialization - field names and values
 * alike. Nothing is redacted, filtered or summarized. Whoever operates this
 * application therefore has to control access to the log and bound its
 * retention.
 *
 * One case per body-rendering branch:
 *   1. object body    -> JSON.stringify(req.body)
 *   2. primitive body -> String(req.body)
 *   3. absent body    -> '{}', for both undefined and null
 *   4. circular body  -> '[Object - Unable to serialize]' plus a logger.error
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
    // clearMocks in jest.config.js clears call history but leaves a spy's
    // replacement implementation installed, so each case installs its own and
    // afterEach restores it. The empty implementation also keeps the real
    // console quiet under verbose: true.
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Only the three fields the middleware reads. originalUrl is mandatory: the
  // module logs req.originalUrl and not req.url, so a fixture omitting it
  // would record 'undefined' as the path.
  const buildRequest = (method, originalUrl, body) => ({
    method,
    originalUrl,
    body
  });

  it('should log an object body as its JSON serialization', () => {
    const body = { name: 'ada', nested: { id: 42 }, note: null };

    requestLogger(buildRequest('POST', '/hello', body), {}, next);

    // Seven arguments, in order - the logger renders them space-joined
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'POST',
      'Path:',
      '/hello',
      'Body:',
      JSON.stringify(body)
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should coerce a primitive body with String()', () => {
    // typeof [] is 'object', so an array body takes the JSON.stringify branch;
    // only a string, number or boolean reaches this one. The query string in
    // the path is asserted verbatim because that is what the module records.
    requestLogger(buildRequest('PUT', '/hello?page=2', 42), {}, next);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'PUT',
      'Path:',
      '/hello?page=2',
      'Body:',
      '42'
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should log an absent body as {} for undefined and for null', () => {
    // The outer guard is a two-operand &&: undefined short-circuits on the
    // first operand and null fails the second, so both inputs are needed for
    // the branch to be covered end to end.
    requestLogger(buildRequest('GET', '/hello', undefined), {}, next);
    requestLogger(buildRequest('GET', '/hello', null), {}, next);

    expect(infoSpy).toHaveBeenCalledTimes(2);
    infoSpy.mock.calls.forEach((call) => {
      expect(call).toEqual([
        'HTTP Request -',
        'Method:',
        'GET',
        'Path:',
        '/hello',
        'Body:',
        '{}'
      ]);
    });
    expect(errorSpy).not.toHaveBeenCalled();

    // Two invocations, so two handoffs - next() sits outside every branch
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should report an unserializable body and still call next()', () => {
    // A genuine circular reference, so JSON.stringify really throws
    const body = {};
    body.self = body;

    requestLogger(buildRequest('POST', '/hello', body), {}, next);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      'HTTP Request -',
      'Method:',
      'POST',
      'Path:',
      '/hello',
      'Body:',
      '[Object - Unable to serialize]'
    );

    // The failure path is the one place the module writes twice: the request
    // record above, plus this four-argument report of the failure itself
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Request body serialization failed:',
      expect.any(String),
      'for path:',
      '/hello'
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
