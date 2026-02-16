const UNIT_ALIASES = {
  pcs: 'pcs',
  pc: 'pcs',
  piece: 'pcs',
  pieces: 'pcs',
  nos: 'pcs',
  no: 'pcs',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  g: 'g',
  gram: 'g',
  grams: 'g',
  ml: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  liter: 'litre',
  liters: 'litre',
  litre: 'litre',
  litres: 'litre',
  l: 'litre',
  bottle: 'bottle',
  bottles: 'bottle',
};

const IRREGULAR_SINGULAR = {
  tomatoes: 'tomato',
  potatoes: 'potato',
  chilies: 'chili',
  chillies: 'chili',
  leaves: 'leaf',
  loaves: 'loaf',
  knives: 'knife',
  shelves: 'shelf',
};

const SAMPLE_VOICE_PHRASES = [
  'add 3 tomatoes',
  'remove 4 potatoes',
  'set onions to 2 kg',
  'add 500 g ginger',
  'remove 1 bottle olive oil',
  'add 6 eggs',
];

function canonicalizeUnit(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().replace(/\./g, '').trim();
  return UNIT_ALIASES[normalized] ?? null;
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularize(word) {
  const clean = word.trim().toLowerCase();
  if (!clean) return clean;
  if (IRREGULAR_SINGULAR[clean]) return IRREGULAR_SINGULAR[clean];
  if (clean.endsWith('ies') && clean.length > 3) return `${clean.slice(0, -3)}y`;
  if (clean.endsWith('oes') && clean.length > 3) return clean.slice(0, -2);
  if (clean.endsWith('es') && clean.length > 3 && !clean.endsWith('ses')) return clean.slice(0, -2);
  if (clean.endsWith('s') && clean.length > 2 && !clean.endsWith('ss')) return clean.slice(0, -1);
  return clean;
}

function normalizeName(value) {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean)
    .map((token) => singularize(token))
    .join(' ');
}

function titleCase(value) {
  return String(value ?? '')
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function tokenScore(query, target) {
  if (!query || !target) return 0;
  if (query === target) return 1;
  if (query.includes(target) || target.includes(query)) return 0.9;

  const queryTokens = query.split(' ').filter(Boolean);
  const targetTokens = target.split(' ').filter(Boolean);
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;

  const matches = queryTokens.filter((token) =>
    targetTokens.some((targetToken) => targetToken === token || targetToken.includes(token) || token.includes(targetToken)),
  );

  return matches.length / Math.max(queryTokens.length, targetTokens.length);
}

function resolveItemMatch(rawItemName, inventoryItems) {
  const normalizedQuery = normalizeName(rawItemName);
  if (!normalizedQuery) return null;

  let best = null;
  for (const item of inventoryItems) {
    const normalizedItemName = normalizeName(item.name);
    const score = tokenScore(normalizedQuery, normalizedItemName);
    if (!best || score > best.score) {
      best = { item, score };
    }
  }

  if (!best || best.score < 0.45) return null;
  return best;
}

function extractSegments(text) {
  const matches = String(text ?? '').match(
    /(?:add|remove|set)\b[\s\S]*?(?=(?:\badd\b|\bremove\b|\bset\b|$))/gi,
  );

  if (!matches || matches.length === 0) {
    const trimmed = String(text ?? '').trim();
    return trimmed ? [trimmed] : [];
  }

  return matches
    .map((segment) =>
      segment
        .trim()
        .replace(/\band\s*$/i, '')
        .trim(),
    )
    .filter(Boolean);
}

function parseSetCommand(segmentText) {
  const setPattern = /^set\s+(.+?)\s+to\s+([0-9]*\.?[0-9]+)\s*([a-zA-Z]+)?$/i;
  const match = segmentText.match(setPattern);
  if (!match) return null;

  const [, itemRaw, amountRaw, unitRaw] = match;
  return {
    action: 'set',
    itemRaw,
    amount: Number(amountRaw),
    unit: canonicalizeUnit(unitRaw),
    invalidUnit: unitRaw && !canonicalizeUnit(unitRaw) ? unitRaw : null,
  };
}

function parseAddRemoveCommand(segmentText) {
  const verbMatch = segmentText.match(/^(add|remove)\s+(.+)$/i);
  if (!verbMatch) return null;

  const action = verbMatch[1].toLowerCase();
  const remaining = verbMatch[2].trim();

  const withAmountPattern = /^([0-9]*\.?[0-9]+)\s*([a-zA-Z]+)?\s+(.+)$/;
  const withAmount = remaining.match(withAmountPattern);

  if (withAmount) {
    const [, amountRaw, unitRaw, itemRaw] = withAmount;
    return {
      action,
      itemRaw,
      amount: Number(amountRaw),
      unit: canonicalizeUnit(unitRaw),
      invalidUnit: unitRaw && !canonicalizeUnit(unitRaw) ? unitRaw : null,
    };
  }

  return {
    action,
    itemRaw: remaining,
    amount: 1,
    unit: null,
    invalidUnit: null,
  };
}

function normalizeItemCandidate(rawName) {
  return String(rawName ?? '')
    .toLowerCase()
    .replace(/\b(the|a|an|some|my|our)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSegment(segmentText, inventoryItems) {
  const segment = String(segmentText ?? '').trim();
  if (!segment) {
    return { action: null, warning: 'Empty command segment skipped.' };
  }

  const parsed = parseSetCommand(segment) ?? parseAddRemoveCommand(segment);
  if (!parsed) {
    return {
      action: null,
      warning: `Could not understand command segment: "${segment}"`,
    };
  }

  if (!Number.isFinite(parsed.amount) || parsed.amount < 0) {
    return {
      action: null,
      warning: `Invalid quantity in command segment: "${segment}"`,
    };
  }

  const candidateName = normalizeItemCandidate(parsed.itemRaw);
  const matched = resolveItemMatch(candidateName, inventoryItems);
  const warningMessages = [];

  if (parsed.invalidUnit) {
    warningMessages.push(
      `Unit "${parsed.invalidUnit}" is not recognized. Defaulting to item unit.`,
    );
  }

  if (matched) {
    return {
      action: {
        action: parsed.action,
        amount: parsed.amount,
        inputUnit: parsed.unit,
        itemId: matched.item.id,
        itemName: matched.item.name,
        itemCategory: matched.item.category,
        itemUnitType: matched.item.unitType,
        isNewItem: false,
        rawItemName: candidateName,
        warnings: warningMessages,
      },
      warning: null,
    };
  }

  const proposedName = titleCase(normalizeName(candidateName));
  warningMessages.push(`Item not found. Will create a new item: ${proposedName}.`);

  return {
    action: {
      action: parsed.action,
      amount: parsed.amount,
      inputUnit: parsed.unit,
      itemId: null,
      itemName: proposedName,
      itemCategory: 'Snacks',
      itemUnitType: parsed.unit ?? 'pcs',
      isNewItem: true,
      rawItemName: candidateName,
      warnings: warningMessages,
    },
    warning: null,
  };
}

function convertAmount(amount, fromUnit, toUnit) {
  if (!fromUnit || !toUnit || fromUnit === toUnit) {
    return { value: amount, converted: false, warning: null };
  }

  if (fromUnit === 'g' && toUnit === 'kg') {
    return { value: amount / 1000, converted: true, warning: null };
  }
  if (fromUnit === 'kg' && toUnit === 'g') {
    return { value: amount * 1000, converted: true, warning: null };
  }
  if (fromUnit === 'ml' && toUnit === 'litre') {
    return { value: amount / 1000, converted: true, warning: null };
  }
  if (fromUnit === 'litre' && toUnit === 'ml') {
    return { value: amount * 1000, converted: true, warning: null };
  }

  return {
    value: amount,
    converted: false,
    warning: `Unit ${fromUnit} does not match ${toUnit}. Used ${toUnit} as-is.`,
  };
}

function buildNewItem(action) {
  return {
    id: `food_item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: action.itemName,
    category: action.itemCategory || 'Snacks',
    unitType: action.inputUnit || action.itemUnitType || 'pcs',
    quantity: 0,
    lowStockThreshold: action.inputUnit === 'kg' || action.inputUnit === 'litre' ? 0.25 : 1,
    icon: '🆕',
  };
}

export function parseVoiceCommand(text, inventoryItems) {
  const segments = extractSegments(text);
  if (segments.length === 0) {
    return {
      actions: [],
      warnings: ['No command found. Try something like: add 3 tomatoes.'],
    };
  }

  const warnings = [];
  const actions = [];

  for (const segment of segments) {
    const result = parseSegment(segment, inventoryItems);
    if (result.warning) warnings.push(result.warning);
    if (result.action) actions.push(result.action);
  }

  return { actions, warnings };
}

export function applyVoiceActions(inventoryItems, actions) {
  const next = inventoryItems.map((item) => ({ ...item }));
  const warnings = [];

  for (const action of actions) {
    let index = next.findIndex((item) => item.id === action.itemId);

    if (index < 0 && action.isNewItem) {
      next.push(buildNewItem(action));
      index = next.length - 1;
    }

    if (index < 0) {
      warnings.push(`Skipped action for unknown item: ${action.itemName}`);
      continue;
    }

    const current = next[index];
    const fromUnit = action.inputUnit || current.unitType;
    const converted = convertAmount(action.amount, fromUnit, current.unitType);
    const amount = Math.max(0, converted.value);

    if (converted.warning) warnings.push(converted.warning);

    if (action.action === 'add') {
      current.quantity += amount;
    }

    if (action.action === 'set') {
      current.quantity = amount;
    }

    if (action.action === 'remove') {
      const rawNext = current.quantity - amount;
      if (rawNext < 0) {
        warnings.push(`Removed more than available for ${current.name}. Quantity clamped to 0.`);
      }
      current.quantity = Math.max(0, rawNext);
    }

    next[index] = {
      ...current,
      quantity: Number(current.quantity.toFixed(3)),
    };
  }

  return { nextInventory: next, warnings };
}

export function getRandomSampleVoicePhrase() {
  const index = Math.floor(Math.random() * SAMPLE_VOICE_PHRASES.length);
  return SAMPLE_VOICE_PHRASES[index];
}

export function toCanonicalUnit(value) {
  return canonicalizeUnit(value);
}
