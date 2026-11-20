// Match the per-product quantity limit in the API order validator.
const MAX_QUANTITY_PER_PRODUCT = 20;

export function getCartQuantityLimit(stock) {
  return Math.min(stock, MAX_QUANTITY_PER_PRODUCT);
}

function quantityLimitMessage({ stock, name }) {
  if (stock <= MAX_QUANTITY_PER_PRODUCT) {
    return `Only ${stock} unit(s) of ${name} are available.`;
  }
  return `Only ${MAX_QUANTITY_PER_PRODUCT} units per product are allowed in one order.`;
}

export function findCartItem(cart, productId) {
  return cart.find((item) => item.productId === productId);
}

export function calculateItemSubtotal(item) {
  return item.price * item.quantity;
}

export function calculateCartItemCount(cart) {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function calculateCartTotal(cart) {
  return cart.reduce((total, item) => total + calculateItemSubtotal(item), 0);
}

export function addProductToCart(cart, product) {
  const existingItem = findCartItem(cart, product.id);
  const currentQuantity = existingItem?.quantity ?? 0;

  if (currentQuantity >= getCartQuantityLimit(product.stock)) {
    return { cart, error: quantityLimitMessage(product) };
  }

  if (existingItem) {
    return {
      cart: cart.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ),
      error: ''
    };
  }

  return {
    cart: [...cart, {
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      stock: product.stock,
      quantity: 1
    }],
    error: ''
  };
}

export function updateCartQuantity(cart, productId, quantity) {
  const item = findCartItem(cart, productId);
  if (!item) return { cart, error: 'Cart item could not be found.' };
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { cart, error: 'Quantity must be a whole number greater than zero.' };
  }
  if (quantity > getCartQuantityLimit(item.stock)) {
    return { cart, error: quantityLimitMessage(item) };
  }
  return {
    cart: cart.map((current) => current.productId === productId ? { ...current, quantity } : current),
    error: ''
  };
}
