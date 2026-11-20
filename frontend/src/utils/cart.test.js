import { describe, expect, it } from 'vitest';
import { addProductToCart, calculateCartItemCount, calculateCartTotal, updateCartQuantity } from './cart.js';

describe('cart utilities', () => {
  it('counts all item quantities and returns zero for an empty cart', () => {
    expect(calculateCartItemCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
    expect(calculateCartItemCount([])).toBe(0);
  });

  it('calculates the cart total', () => {
    expect(calculateCartTotal([
      { price: 100, quantity: 2 },
      { price: 50, quantity: 3 }
    ])).toBe(350);
  });

  it('adds a new product', () => {
    const result = addProductToCart([], { id: 1, name: 'Mouse', price: 500, stock: 2 });
    expect(result.error).toBe('');
    expect(result.cart[0].quantity).toBe(1);
  });

  it('preserves the cart and reports stock when both quantity controls exceed available stock', () => {
    const product = { id: 1, name: 'Mouse', price: 500, stock: 1 };
    const { cart } = addProductToCart([], product);
    for (const result of [addProductToCart(cart, product), updateCartQuantity(cart, 1, 2)]) {
      expect(result.cart).toBe(cart);
      expect(result.error).toBe('Only 1 unit(s) of Mouse are available.');
    }
  });

  it('allows 20 units and rejects a 21st unit through repeated additions', () => {
    const product = { id: 1, name: 'Pencil', price: 25, stock: 25 };
    const { cart } = addProductToCart([], product);
    const atNineteen = updateCartQuantity(cart, 1, 19).cart;
    const atLimit = addProductToCart(atNineteen, product);
    expect(atLimit.error).toBe('');
    expect(atLimit.cart[0].quantity).toBe(20);

    const rejected = addProductToCart(atLimit.cart, product);
    expect(rejected.cart).toBe(atLimit.cart);
    expect(rejected.error).toContain('20 units per product');
  });

  it('allows entering 20 units and rejects entering 21', () => {
    const { cart } = addProductToCart([], { id: 1, name: 'Pencil', price: 25, stock: 25 });
    const atLimit = updateCartQuantity(cart, 1, 20);
    expect(atLimit.error).toBe('');
    expect(atLimit.cart[0].quantity).toBe(20);

    const rejected = updateCartQuantity(atLimit.cart, 1, 21);
    expect(rejected.cart).toBe(atLimit.cart);
    expect(rejected.error).toContain('20 units per product');
  });
});
