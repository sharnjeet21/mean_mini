/**
 * Input validation and sanitization middleware for query parameters.
 * Validates printable Unicode characters, enforces max length,
 * and strips HTML/script tags before forwarding to route handlers.
 */

/**
 * Returns Express middleware that validates and sanitizes a named query parameter.
 *
 * @param {string} paramName - The query parameter name to validate (e.g. 'place', 'q').
 * @param {number} [maxLength=200] - Maximum allowed character length.
 * @returns {Function} Express middleware (req, res, next)
 */
function validateQueryParam(paramName, maxLength = 200) {
  return (req, res, next) => {
    const raw = req.query[paramName];

    // 1. Check param exists and is non-empty
    if (raw === undefined || raw === null || raw.trim() === '') {
      return res.status(400).json({
        message: `Missing or empty query parameter: '${paramName}'.`,
      });
    }

    // 2. Validate only printable Unicode characters
    const printableUnicodeRegex = /^[\x20-\x7E\u00A0-\uFFFF]+$/;
    if (!printableUnicodeRegex.test(raw)) {
      return res.status(400).json({
        message: `Invalid characters in query parameter '${paramName}'. Only printable characters are allowed.`,
      });
    }

    // 3. Check length <= maxLength
    if (raw.length > maxLength) {
      return res.status(400).json({
        message: `Query parameter '${paramName}' exceeds maximum length of ${maxLength} characters.`,
      });
    }

    // 4. Strip HTML tags and <script> content via regex
    // First remove <script>...</script> blocks (including content)
    let sanitized = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    // Then strip any remaining HTML tags
    sanitized = sanitized.replace(/<[^>]+>/g, '');
    // Trim any leftover whitespace
    sanitized = sanitized.trim();

    // 5. Attach sanitized value to req.sanitized[paramName]
    if (!req.sanitized) {
      req.sanitized = {};
    }
    req.sanitized[paramName] = sanitized;

    next();
  };
}

module.exports = { validateQueryParam };
