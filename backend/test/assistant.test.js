import test from 'node:test';
import assert from 'node:assert/strict';
import { answerAssistantQuestion, buildAssistantResponse, parseBudget, rankProducts } from '../src/services/assistant.js';
import { requestGeminiDraft } from '../src/services/gemini.js';

const products = [
  { id: 1, name: 'Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: 1800, stock: 2 },
  { id: 2, name: 'Mouse', category: 'Accessories', description: 'Wireless mouse', price: 600, stock: 3 }
];

test('parseBudget extracts a peso budget', () => assert.equal(parseBudget('below ₱2,000'), 2000));
test('rankProducts respects the budget', () => assert.deepEqual(rankProducts(products, 'mouse below 700').map((p) => p.id), [2]));
test('assistant response contains traceable sources', () => assert.equal(buildAssistantResponse(products, 'keyboard').sources[0].id, 1));

test('matches only relevant products and respects strict and inclusive peso limits', () => {
  assert.deepEqual(rankProducts(products, 'Which keyboards are below ₱2,000?').map(({ id }) => id), [1]);
  assert.deepEqual(rankProducts(products, 'keyboard below ₱1,800'), []);
  assert.deepEqual(rankProducts(products, 'keyboard up to ₱1,800').map(({ id }) => id), [1]);
  assert.equal(parseBudget('keyboard under ₱1,800.50'), 1800.5);
  assert.equal(parseBudget('1080p webcam'), null);
});

test('returns no sources for an absent product type or feature', () => {
  for (const question of ['telescope below ₱2,000', 'wireless keyboard']) {
    const result = buildAssistantResponse(products, question);
    assert.deepEqual(result.recommendedProducts, []);
    assert.deepEqual(result.sources, []);
  }
});

test('excludes inactive and out-of-stock products even when their terms match', () => {
  const unavailable = [
    { ...products[0], id: 3, stock: 0 },
    { ...products[0], id: 4, active: false }
  ];
  assert.deepEqual(rankProducts(unavailable, 'mechanical keyboard'), []);
});

const verifiedClaim = { id: 1, price: 1800, inStock: true, includeDescription: true };
const geminiResponse = (draft) => Response.json({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: draft }] } }]
});

test('Gemini receives only selected public facts and the verified draft shapes the answer', async () => {
  let outbound;
  const result = await answerAssistantQuestion(products, 'Which keyboard is below ₱2,000?', (question, matches) =>
    requestGeminiDraft(question, matches, {
      apiKey: 'test-key',
      fetchImpl: async (url, request) => {
        assert.equal(new URL(url).host, 'generativelanguage.googleapis.com');
        assert.equal(request.headers['x-goog-api-key'], 'test-key');
        outbound = JSON.parse(JSON.parse(request.body).contents[0].parts[0].text);
        return geminiResponse(JSON.stringify({ opening: 'recommendation', products: [verifiedClaim] }));
      }
    })
  );
  assert.deepEqual(outbound, {
    question: 'Find in-stock matches for keyboard within the requested budget.',
    catalog: [products[0]]
  });
  assert.equal(result.mode, 'ai');
  assert.match(result.answer, /I recommend.*₱1,800.*Mechanical keyboard/);
  assert.deepEqual(result.sources.map(({ id }) => id), [1]);
});

test('invalid draft claims and provider failures return the verified catalog fallback', async () => {
  const expected = buildAssistantResponse(products, 'keyboard');
  const replies = [
    [{ ...verifiedClaim, id: 2 }],
    [verifiedClaim, verifiedClaim],
    [{ ...verifiedClaim, price: 1 }],
    [{ ...verifiedClaim, inStock: false }],
    [{ ...verifiedClaim, claim: 'unverified' }]
  ].map((claims) => () => geminiResponse(JSON.stringify({ opening: 'recommendation', products: claims })));
  replies.push(
    () => geminiResponse('invalid JSON'),
    () => new Response(null, { status: 429 }),
    () => new Response(null, { status: 503 }),
    () => { throw new DOMException('Timed out', 'TimeoutError'); }
  );
  for (const fetchImpl of replies) {
    const result = await answerAssistantQuestion(products, 'keyboard', (question, matches) =>
      requestGeminiDraft(question, matches, { apiKey: 'test-key', fetchImpl })
    );
    assert.deepEqual(result, expected);
  }
});

test('no catalog match skips the provider', async () => {
  const requestDraft = test.mock.fn();
  const result = await answerAssistantQuestion(products, 'telescope', requestDraft);
  assert.equal(result.mode, 'no_match');
  assert.equal(requestDraft.mock.callCount(), 0);
});
