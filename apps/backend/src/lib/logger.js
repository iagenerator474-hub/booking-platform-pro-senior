function nowISO() {
  return new Date().toISOString();
}

function serializeError(err) {
  if (!err) return undefined;

  // Support passing a plain object too
  const name = err.name || 'Error';
  const message = err.message || String(err);

  return {
    name,
    message,
    // Keep stack only outside production to reduce leaking sensitive info
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  };
}

function write(level, payload) {
  const entry = {
    timestamp: nowISO(),
    level,
    ...payload,
  };

  // JSON logs: easy to grep + ingest in any log tool later.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

function makeLogger(baseContext = {}) {
  return {
    info: (p) => write('info', { ...baseContext, ...p }),
    warn: (p) => write('warn', { ...baseContext, ...p }),
    error: (p) =>
      write('error', {
        ...baseContext,
        ...p,
        error: serializeError(p && p.error),
      }),
    child: (ctx) => makeLogger({ ...baseContext, ...ctx }),
  };
}

module.exports = { makeLogger };
