/**
 * Server logger. No-op by default (no logs). Set LOG_LEVEL=info|warn|error to enable.
 */

function timestamp() {
  return new Date().toISOString();
}

function format(level, message, meta = null) {
  const parts = [timestamp(), level.toUpperCase().padEnd(5), message];
  if (meta != null && typeof meta === 'object') {
    try {
      parts.push(JSON.stringify(meta));
    } catch {
      parts.push(String(meta));
    }
  }
  return parts.join(' ');
}

const level = (process.env.LOG_LEVEL ?? '').toLowerCase();
const enabled = level === 'info' || level === 'warn' || level === 'error';

export const logger = {
  info(message, meta = null) {
    if (enabled) process.stdout.write(format('info', message, meta) + '\n');
  },
  warn(message, meta = null) {
    if (enabled) process.stderr.write(format('warn', message, meta) + '\n');
  },
  error(message, meta = null) {
    if (enabled) process.stderr.write(format('error', message, meta) + '\n');
  },
};
