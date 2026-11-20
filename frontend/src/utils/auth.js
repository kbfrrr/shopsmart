export function safeReturnPath(path) {
  return typeof path === 'string' && /^\/(?:checkout|orders(?:\/[1-9]\d*)?)$/.test(path) ? path : '/orders';
}
