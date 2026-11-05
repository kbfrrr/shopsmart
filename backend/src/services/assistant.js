import { requestGeminiDraft } from './gemini.js';

const amount = String.raw`(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(?![\w,]|\.\d)`;
const budgetPattern = new RegExp(
  String.raw`(?:(\bbelow|\bunder|\bless than|\bup to|\bat most|\bmaximum(?: of)?|\bbudget(?: of)?)\s+(?:₱\s*|php\s*)?|(?:₱\s*|\bphp\s*))${amount}`,
  'i'
);
const strictLimits = new Set(['below', 'under', 'less than']);
const questionWords = new Set(
  'a an are can could do does find for have how i in is me much of please recommend show stock the there to want what which with would you your'.split(' ')
);

function readBudget(question) {
  const match = question.match(budgetPattern);
  if (!match) return null;
  const [, operator, whole, fraction = '0'] = match;
  return {
    clause: match[0],
    amount: Number(`${whole.replaceAll(',', '')}.${fraction}`),
    exclusive: strictLimits.has(operator?.toLowerCase())
  };
}

export function parseBudget(question) {
  return readBudget(question)?.amount ?? null;
}

function catalogTerms(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).map((word) => {
    if (word === 'mice') return 'mouse';
    if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
    if (/(?:ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
    return word.length > 3 && /[^su]s$/.test(word) ? word.slice(0, -1) : word;
  });
}

function readProductQuery(question) {
  const budget = readBudget(question);
  const query = budget ? question.replace(budget.clause, ' ') : question;
  const terms = [...new Set(catalogTerms(query).filter((term) => !questionWords.has(term)))];
  return { terms, budget };
}

export function rankProducts(products, question) {
  return rankMatches(products, readProductQuery(question));
}

function rankMatches(products, { terms, budget }) {
  if (terms.length === 0 && !budget) return [];

  return products
    .flatMap((product) => {
      if (product.active === false || product.stock <= 0) return [];
      const price = Number(product.price);
      if (budget && (budget.exclusive ? price >= budget.amount : price > budget.amount)) return [];

      const primaryTerms = new Set(catalogTerms(`${product.name} ${product.category}`));
      const descriptionTerms = new Set(catalogTerms(product.description));
      if (!terms.every((term) => primaryTerms.has(term) || descriptionTerms.has(term))) return [];

      const score = terms.filter((term) => primaryTerms.has(term)).length;
      return [{ ...product, price, score }];
    })
    .sort((a, b) => b.score - a.score || a.price - b.price || a.id - b.id);
}

export function buildAssistantResponse(products, question) {
  return formatResponse(rankProducts(products, question).slice(0, 3));
}

export async function answerAssistantQuestion(products, question, requestDraft = requestGeminiDraft) {
  const query = readProductQuery(question);
  const ranked = rankMatches(products, query).slice(0, 3);
  if (ranked.length === 0) return formatResponse(ranked);

  // Matching verifies every forwarded term against public catalog text. Keep the raw question local.
  const productTerms = query.terms.join(' ') || 'products';
  const budgetNote = query.budget ? ' within the requested budget' : '';
  const safeQuestion = `Find in-stock matches for ${productTerms}${budgetNote}.`;
  let draft;
  try {
    draft = await requestDraft(safeQuestion, ranked);
  } catch {
    return formatResponse(ranked);
  }

  if (!draft) return formatResponse(ranked);
  const matchedById = new Map(ranked.map((product) => [product.id, product]));
  const seen = new Set();
  const selected = [];
  for (const claim of draft.products) {
    const product = matchedById.get(claim.id);
    if (!product || seen.has(claim.id) || claim.price !== product.price || claim.inStock !== (product.stock > 0)) {
      return formatResponse(ranked);
    }
    seen.add(claim.id);
    selected.push({ ...product, includeDescription: claim.includeDescription });
  }
  return formatResponse(selected, draft.opening);
}

function formatResponse(products, opening) {
  if (products.length === 0) {
    return { answer: 'I could not find an in-stock product matching that request.', recommendedProducts: [], sources: [], mode: 'no_match' };
  }
  const matches = products.map(({ name, price }) => {
    const formattedPrice = price.toLocaleString('en-PH', { maximumFractionDigits: 2 });
    return `${name} (₱${formattedPrice}, in stock)`;
  }).join(', ');
  const lead = opening === 'recommendation' ? 'I recommend' : 'I found these matches in the ShopSmart catalog';
  const descriptions = products.filter((product) => product.includeDescription && product.description.trim())
    .map(({ name, description }) => `${name} — ${description.trim()}`);
  return {
    answer: [`${lead}: ${matches}.`, ...descriptions].join(' '),
    recommendedProducts: products.map(({ id, name, price, category }) => ({ id, name, price, category })),
    sources: products.map(({ id, name }) => ({ type: 'product', id, name })),
    mode: opening ? 'ai' : 'catalog'
  };
}
