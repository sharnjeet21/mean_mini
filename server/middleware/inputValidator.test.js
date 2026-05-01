/**
 * Unit tests for server/middleware/inputValidator.js
 *
 * Tests cover:
 *  - Missing / empty parameter → 400
 *  - Non-printable characters → 400
 *  - Oversized strings → 400
 *  - HTML / script injection → 400 (rejected before sanitization) or stripped
 *  - Valid inputs → sanitized value attached to req.sanitized
 *  - Custom maxLength
 */

const { validateQueryParam } = require('./inputValidator');

/**
 * Helper: build a minimal mock req/res/next triple and run the middleware.
 * Returns { statusCode, body, req, nextCalled }.
 */
function runMiddleware(paramName, queryValue, maxLength) {
  const req = {
    query: queryValue !== undefined ? { [paramName]: queryValue } : {},
    sanitized: undefined,
  };

  let statusCode = null;
  let body = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      body = data;
      return this;
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  const middleware =
    maxLength !== undefined
      ? validateQueryParam(paramName, maxLength)
      : validateQueryParam(paramName);

  middleware(req, res, next);

  return { statusCode, body, req, nextCalled };
}

// ---------------------------------------------------------------------------
// 1. Missing / empty parameter
// ---------------------------------------------------------------------------
describe('validateQueryParam — missing or empty param', () => {
  test('returns 400 when param is absent', () => {
    const { statusCode, body, nextCalled } = runMiddleware('place', undefined);
    expect(statusCode).toBe(400);
    expect(body.message).toMatch(/place/);
    expect(nextCalled).toBe(false);
  });

  test('returns 400 when param is an empty string', () => {
    const { statusCode, body, nextCalled } = runMiddleware('place', '');
    expect(statusCode).toBe(400);
    expect(body.message).toMatch(/place/);
    expect(nextCalled).toBe(false);
  });

  test('returns 400 when param is whitespace only', () => {
    const { statusCode, body, nextCalled } = runMiddleware('place', '   ');
    expect(statusCode).toBe(400);
    expect(nextCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Non-printable / invalid characters
// ---------------------------------------------------------------------------
describe('validateQueryParam — non-printable characters', () => {
  test('returns 400 for string containing null byte', () => {
    const { statusCode, nextCalled } = runMiddleware('q', 'hello\x00world');
    expect(statusCode).toBe(400);
    expect(nextCalled).toBe(false);
  });

  test('returns 400 for string containing control character \\x01', () => {
    const { statusCode, nextCalled } = runMiddleware('q', 'abc\x01def');
    expect(statusCode).toBe(400);
    expect(nextCalled).toBe(false);
  });

  test('returns 400 for string containing tab character (\\x09)', () => {
    // Tab (0x09) is below 0x20 — not in printable range
    const { statusCode, nextCalled } = runMiddleware('q', 'hello\tworld');
    expect(statusCode).toBe(400);
    expect(nextCalled).toBe(false);
  });

  test('returns 400 for string containing newline', () => {
    const { statusCode, nextCalled } = runMiddleware('q', 'line1\nline2');
    expect(statusCode).toBe(400);
    expect(nextCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Length validation
// ---------------------------------------------------------------------------
describe('validateQueryParam — length validation', () => {
  test('returns 400 when string exceeds default 200-char limit', () => {
    const long = 'a'.repeat(201);
    const { statusCode, body, nextCalled } = runMiddleware('place', long);
    expect(statusCode).toBe(400);
    expect(body.message).toMatch(/200/);
    expect(nextCalled).toBe(false);
  });

  test('accepts string of exactly 200 characters', () => {
    const exact = 'a'.repeat(200);
    const { statusCode, nextCalled } = runMiddleware('place', exact);
    expect(statusCode).toBeNull();
    expect(nextCalled).toBe(true);
  });

  test('returns 400 when string exceeds custom maxLength', () => {
    const { statusCode, nextCalled } = runMiddleware('q', 'hello world', 5);
    expect(statusCode).toBe(400);
    expect(nextCalled).toBe(false);
  });

  test('accepts string within custom maxLength', () => {
    const { statusCode, nextCalled } = runMiddleware('q', 'hi', 5);
    expect(statusCode).toBeNull();
    expect(nextCalled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. HTML / script injection
// ---------------------------------------------------------------------------
describe('validateQueryParam — HTML and script injection', () => {
  test('strips plain HTML tags from valid input', () => {
    const { req, nextCalled } = runMiddleware('place', 'Paris <b>France</b>');
    expect(nextCalled).toBe(true);
    expect(req.sanitized.place).toBe('Paris France');
  });

  test('strips <script>...</script> blocks including content', () => {
    const { req, nextCalled } = runMiddleware(
      'place',
      'London <script>alert(1)</script>'
    );
    expect(nextCalled).toBe(true);
    expect(req.sanitized.place).toBe('London');
  });

  test('strips <img> injection tag', () => {
    const { req, nextCalled } = runMiddleware(
      'q',
      'Tokyo <img src=x onerror=alert(1)>'
    );
    expect(nextCalled).toBe(true);
    expect(req.sanitized.q).toBe('Tokyo');
  });

  test('strips nested / multiple tags', () => {
    const { req, nextCalled } = runMiddleware(
      'place',
      '<div><span>Rome</span></div>'
    );
    expect(nextCalled).toBe(true);
    expect(req.sanitized.place).toBe('Rome');
  });
});

// ---------------------------------------------------------------------------
// 5. Valid inputs — sanitized value attached to req.sanitized
// ---------------------------------------------------------------------------
describe('validateQueryParam — valid inputs', () => {
  test('attaches sanitized value to req.sanitized[paramName]', () => {
    const { req, nextCalled, statusCode } = runMiddleware('place', 'Paris');
    expect(statusCode).toBeNull();
    expect(nextCalled).toBe(true);
    expect(req.sanitized).toBeDefined();
    expect(req.sanitized.place).toBe('Paris');
  });

  test('initialises req.sanitized if not already present', () => {
    const { req } = runMiddleware('q', 'Tokyo');
    expect(req.sanitized).toBeDefined();
    expect(req.sanitized.q).toBe('Tokyo');
  });

  test('preserves existing req.sanitized keys when adding a new one', () => {
    const req = {
      query: { place: 'Berlin' },
      sanitized: { q: 'existing' },
    };
    let nextCalled = false;
    const res = { status() { return this; }, json() { return this; } };
    validateQueryParam('place')(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.sanitized.q).toBe('existing');
    expect(req.sanitized.place).toBe('Berlin');
  });

  test('accepts accented / extended Latin characters (u00A0-uFFFF range)', () => {
    const { req, nextCalled } = runMiddleware('place', 'Zürich');
    expect(nextCalled).toBe(true);
    expect(req.sanitized.place).toBe('Zürich');
  });

  test('accepts standard ASCII printable characters', () => {
    const { req, nextCalled } = runMiddleware('q', 'New York, USA!');
    expect(nextCalled).toBe(true);
    expect(req.sanitized.q).toBe('New York, USA!');
  });
});
