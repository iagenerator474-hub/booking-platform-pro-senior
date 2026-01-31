/**
 * Zod-powered validation middleware (lean, explicit, and testable).
 * It normalizes req.body to the parsed data to avoid "stringly typed" bugs.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "invalid_request",
        message: "Request body validation failed",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
        requestId: req.requestId,
      });
    }
    req.body = result.data;
    return next();
  };
}

module.exports = { validateBody };

