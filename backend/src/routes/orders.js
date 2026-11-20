import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { orderSchema } from '../validators/schemas.js';
import { csrfProtection, requireCustomer } from '../middleware/auth.js';

const serializeOrder = (order) => ({
  ...order, total: Number(order.total),
  items: order.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) }))
});

export function createOrdersRouter(database = prisma, origin = process.env.FRONTEND_URL || 'http://localhost:5173') {
const router = Router();
router.use(requireCustomer(database));

router.get('/', async (request, response, next) => {
  try {
    const orders = await database.order.findMany({
      where: { userId: request.user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50,
      include: { items: { include: { product: { select: { id: true, name: true } } } } }
    });
    response.json({ orders: orders.map(serializeOrder) });
  } catch (error) { next(error); }
});

router.get('/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!/^[1-9]\d*$/.test(request.params.id) || !Number.isSafeInteger(id)) {
      return response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'Order ID must be a positive whole number.' } });
    }
    const order = await database.order.findFirst({
      where: { id, userId: request.user.id },
      include: { items: { include: { product: { select: { id: true, name: true } } } } }
    });
    if (!order) return response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order could not be found.' } });
    response.json(serializeOrder(order));
  } catch (error) { next(error); }
});

router.post('/', csrfProtection(origin), async (request, response, next) => {
  try {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_ORDER', message: 'Check the customer and cart information.', details: parsed.error.flatten() } });

    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    const products = await database.product.findMany({ where: { id: { in: productIds }, active: true } });
    if (products.length !== productIds.length) return response.status(422).json({ error: { code: 'PRODUCT_UNAVAILABLE', message: 'One or more products are unavailable.' } });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = parsed.data.items.map((item) => ({ ...item, product: productMap.get(item.productId) }));
    const unavailable = normalizedItems.find((item) => item.quantity > item.product.stock);
    if (unavailable) return response.status(409).json({ error: { code: 'INSUFFICIENT_STOCK', message: `Only ${unavailable.product.stock} unit(s) of ${unavailable.product.name} are available.` } });

    const total = normalizedItems.reduce((sum, item) => sum.plus(new Prisma.Decimal(item.product.price).times(item.quantity)), new Prisma.Decimal(0));
    const order = await database.$transaction(async (transaction) => {
      for (const item of normalizedItems) {
        const updated = await transaction.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (updated.count !== 1) throw Object.assign(new Error('Stock changed while placing the order.'), { status: 409, code: 'STOCK_CHANGED' });
      }
      return transaction.order.create({
        data: {
          userId: request.user.id,
          customerName: parsed.data.customerName, email: parsed.data.email, address: parsed.data.address, total,
          items: { create: normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.product.price })) }
        },
        include: { items: true }
      });
    });
    response.status(201).json(serializeOrder(order));
  } catch (error) { next(error); }
});

return router;
}
