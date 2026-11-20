import { describe, it, expect } from 'vitest';
import { safeReturnPath } from './auth.js';

describe('sign-in return path', () => {
  it('returns to checkout or an order in the same app', () => {
    for (const path of ['/checkout', '/orders', '/orders/23']) expect(safeReturnPath(path)).toBe(path);
  });
  it('rejects external URLs, protocol-relative URLs, and malformed order paths', () => {
    for (const path of [null, 'https://example.com', '//example.com', '/orders/../evil', '/orders/1?redirect=evil', '/login']) {
      expect(safeReturnPath(path)).toBe('/orders');
    }
  });
});
