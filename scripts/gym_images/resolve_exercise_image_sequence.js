#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const EXERCISE_DIR = path.join(ROOT_DIR, 'exerciseimages');
const EXPECTED_PATH = path.join(EXERCISE_DIR, 'exercise_expected_order.json');
const MATCHES_PATH = path.join(EXERCISE_DIR, 'exercise_image_matches.json');
const OUTPUT_PATH = path.join(EXERCISE_DIR, 'exercise_image_mapping.json');
const REVIEW_PATH = path.join(EXERCISE_DIR, 'exercise_image_alignment_review.json');
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_MODEL || process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4.1-mini';
const SKIP_EXPECTED_PENALTY = -75;
const SKIP_IMAGE_PENALTY = -75;

function getEnv(key) {
  return String(process.env[key] || '').trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value) {
  return new Set(normalize(value).split(' ').filter(Boolean));
}

function jaccard(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function loadData() {
  const expected = readJson(EXPECTED_PATH).items || [];
  const matches = readJson(MATCHES_PATH).items || [];
  return { expected, matches };
}

function scoreAgainstExpected(matchRow, expectedRow, bannedPairs = new Set()) {
  const pairKey = `${matchRow.file_name}__${expectedRow.exercise_id}`;
  if (bannedPairs.has(pairKey)) {
    return { score: -250, reason: 'banned_pair' };
  }
  const candidates = [];
  if (matchRow.match?.best_match_id) {
    candidates.push({
      id: matchRow.match.best_match_id,
      name: matchRow.match.best_match_name,
      confidence: Number(matchRow.match.confidence || 0),
      source: 'best',
    });
  }
  for (const alternate of matchRow.match?.alternates || []) {
    if (!alternate?.id) continue;
    candidates.push({
      id: alternate.id,
      name: alternate.name,
      confidence: Number(alternate.confidence || 0),
      source: 'alternate',
    });
  }

  let score = -20;
  let reason = 'fallback';
  for (const candidate of candidates) {
    if (candidate.id === expectedRow.exercise_id) {
      const candidateScore = candidate.source === 'best'
        ? 120 + candidate.confidence
        : 70 + candidate.confidence;
      if (candidateScore > score) {
        score = candidateScore;
        reason = `${candidate.source}_id_match`;
      }
    }
  }

  const detectedScore = 100 * jaccard(expectedRow.exercise_name, matchRow.match?.detected_exercise_name);
  if (detectedScore > score) {
    score = detectedScore;
    reason = 'detected_name_similarity';
  }

  const bestNameScore = 95 * jaccard(expectedRow.exercise_name, matchRow.match?.best_match_name);
  if (bestNameScore > score) {
    score = bestNameScore;
    reason = 'best_name_similarity';
  }

  const visibleText = normalize(matchRow.match?.visible_text || '');
  if (visibleText) {
    const expectedName = normalize(expectedRow.exercise_name);
    if (visibleText.includes(expectedName)) {
      score = Math.max(score, 110);
      if (score === 110) reason = 'ocr_exact';
    } else {
      const visibleScore = 80 * jaccard(expectedRow.exercise_name, visibleText);
      if (visibleScore > score) {
        score = visibleScore;
        reason = 'ocr_similarity';
      }
    }
  }

  return { score, reason };
}

function findBestAlignment(expected, matches, bannedPairs = new Set()) {
  const m = matches.length;
  const n = expected.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(-Infinity));
  const back = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
  dp[0][0] = 0;

  for (let i = 1; i <= m; i += 1) {
    dp[i][0] = dp[i - 1][0] + SKIP_IMAGE_PENALTY;
    back[i][0] = { action: 'skip_image' };
  }
  for (let j = 1; j <= n; j += 1) {
    dp[0][j] = dp[0][j - 1] + SKIP_EXPECTED_PENALTY;
    back[0][j] = { action: 'skip_expected' };
  }

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const matchScore = scoreAgainstExpected(matches[i - 1], expected[j - 1], bannedPairs);
      const candidates = [
        {
          value: dp[i - 1][j - 1] + matchScore.score,
          step: { action: 'match', score: matchScore.score, reason: matchScore.reason },
        },
        {
          value: dp[i][j - 1] + SKIP_EXPECTED_PENALTY,
          step: { action: 'skip_expected' },
        },
        {
          value: dp[i - 1][j] + SKIP_IMAGE_PENALTY,
          step: { action: 'skip_image' },
        },
      ];
      const best = candidates.sort((a, b) => b.value - a.value)[0];
      dp[i][j] = best.value;
      back[i][j] = best.step;
    }
  }

  let i = m;
  let j = n;
  const assignments = [];
  const missingExercises = [];
  const unusedImages = [];

  while (i > 0 || j > 0) {
    const step = back[i][j];
    if (!step) break;
    if (step.action === 'match') {
      assignments.push({
        matchRow: matches[i - 1],
        expectedRow: expected[j - 1],
        score: step.score,
        reason: step.reason,
      });
      i -= 1;
      j -= 1;
    } else if (step.action === 'skip_expected') {
      missingExercises.push(expected[j - 1]);
      j -= 1;
    } else if (step.action === 'skip_image') {
      unusedImages.push(matches[i - 1]);
      i -= 1;
    } else {
      break;
    }
  }

  assignments.reverse();
  missingExercises.reverse();
  unusedImages.reverse();

  return {
    totalScore: dp[m][n],
    assignments,
    missingExercises,
    unusedImages,
  };
}

function buildInitialPlan(alignment, bannedPairs = new Set()) {
  return alignment.assignments.map((entry, index) => {
    const { matchRow, expectedRow, score, reason } = entry;
    const matchedIds = [
      matchRow.match?.best_match_id,
      ...(matchRow.match?.alternates || []).map((candidate) => candidate?.id),
    ].filter(Boolean);
    return {
      image_index: index + 1,
      source_file: matchRow.file_name,
      expected_order_index: expectedRow.order_index,
      exercise_id: expectedRow.exercise_id,
      exercise_name: expectedRow.exercise_name,
      score,
      score_reason: reason,
      classifier_best_name: matchRow.match?.best_match_name || null,
      classifier_best_id: matchRow.match?.best_match_id || null,
      classifier_detected_name: matchRow.match?.detected_exercise_name || null,
      classifier_confidence: Number(matchRow.match?.confidence || 0),
      classifier_alternates: matchRow.match?.alternates || [],
      visible_text: matchRow.match?.visible_text || null,
      pair_banned: bannedPairs.has(`${matchRow.file_name}__${expectedRow.exercise_id}`),
      validation_status: matchedIds.includes(expectedRow.exercise_id) ? 'classifier_supported' : 'needs_review',
      review: null,
    };
  });
}

function imageToDataUrl(fileName) {
  const absPath = path.join(EXERCISE_DIR, fileName);
  const ext = path.extname(fileName).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(absPath).toString('base64')}`;
}

async function callOpenAI(payload) {
  const apiKey = getEnv('EXPO_PUBLIC_OPENAI_API_KEY') || getEnv('OPENAI_API_KEY');
  if (!apiKey) throw new Error('Missing OpenAI API key');

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OPENAI_${response.status}: ${raw}`);
  }
  const parsed = JSON.parse(raw);
  const outputText = Array.isArray(parsed.output)
    ? parsed.output
      .flatMap((entry) => Array.isArray(entry.content) ? entry.content : [])
      .filter((entry) => entry?.type === 'output_text')
      .map((entry) => entry.text || '')
      .join('\n')
      .trim()
    : '';
  if (!outputText) {
    throw new Error('OpenAI returned empty output_text');
  }
  const first = outputText.indexOf('{');
  const last = outputText.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('No JSON object found in review output');
  }
  return JSON.parse(outputText.slice(first, last + 1));
}

function buildReviewCandidates(planRow, plan, expected) {
  const candidateMap = new Map();

  function addCandidate(id, name, source) {
    if (!id || !name || candidateMap.has(id)) return;
    candidateMap.set(id, { id, name, source });
  }

  addCandidate(planRow.exercise_id, planRow.exercise_name, 'sequence_expected');
  addCandidate(planRow.classifier_best_id, planRow.classifier_best_name, 'classifier_best');
  for (const alt of planRow.classifier_alternates || []) {
    addCandidate(alt.id, alt.name, 'classifier_alternate');
  }

  const expectedIndex = planRow.expected_order_index - 1;
  for (const offset of [-2, -1, 1, 2]) {
    const maybe = expected[expectedIndex + offset];
    if (maybe) addCandidate(maybe.exercise_id, maybe.exercise_name, 'sequence_neighbor');
  }

  return [...candidateMap.values()].slice(0, 8);
}

async function reviewSuspiciousRow(planRow, plan, expected) {
  const candidates = buildReviewCandidates(planRow, plan, expected);
  const prompt = [
    'You are validating an exercise screenshot against a small candidate list.',
    'Return JSON only. No markdown.',
    'Pick the single best candidate from the list, or "none" if no candidate is correct.',
    'Use visible text and the demonstrated movement/equipment.',
    'Schema:',
    '{"chosen_id":"string|null","chosen_name":"string|null","confidence":0,"supports_expected":true,"reasoning":"string"}',
    'Candidates:',
    ...candidates.map((candidate) => `- ${candidate.id} | ${candidate.name} | source=${candidate.source}`),
  ].join('\n');

  const result = await callOpenAI({
    model: OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: prompt }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Expected by sequence: ${planRow.exercise_name}. Classifier best: ${planRow.classifier_best_name || 'none'}. Validate the best candidate.`,
          },
          {
            type: 'input_image',
            image_url: imageToDataUrl(planRow.source_file),
          },
        ],
      },
    ],
    max_output_tokens: 900,
  });

  return {
    candidates,
    chosen_id: result.chosen_id || null,
    chosen_name: result.chosen_name || null,
    confidence: Number(result.confidence || 0),
    supports_expected: Boolean(result.supports_expected),
    reasoning: result.reasoning || '',
  };
}

async function main() {
  const { expected, matches } = loadData();
  let bannedPairs = new Set();
  let alignment = findBestAlignment(expected, matches, bannedPairs);
  let plan = buildInitialPlan(alignment, bannedPairs);
  let needsReview = plan.filter((row) => row.validation_status === 'needs_review' || row.score < 70);

  console.log(`[exercise-resolve] missing exercises: ${alignment.missingExercises.map((row) => row.exercise_name).join(', ') || 'none'}`);
  console.log(`[exercise-resolve] unused images: ${alignment.unusedImages.map((row) => row.file_name).join(', ') || 'none'}`);
  console.log(`[exercise-resolve] suspicious rows: ${needsReview.length}`);

  for (const row of needsReview) {
    try {
      const review = await reviewSuspiciousRow(row, plan, expected);
      row.review = review;
      const reviewConfidence = review.confidence <= 1 ? review.confidence * 100 : review.confidence;
      if (review.chosen_id === row.exercise_id && reviewConfidence >= 60) {
        row.validation_status = 'vision_confirmed';
      } else if (row.exercise_name === 'Shrugs' && review.chosen_name === 'Shrug') {
        row.validation_status = 'vision_plural_variant';
      } else {
        row.validation_status = 'manual_review_recommended';
        if (review.chosen_id && review.chosen_id !== row.exercise_id && reviewConfidence >= 60) {
          bannedPairs.add(`${row.source_file}__${row.exercise_id}`);
        }
      }
      console.log(`[exercise-resolve] review ${row.source_file} -> ${review.chosen_name || 'none'} (${reviewConfidence})`);
    } catch (error) {
      row.review = { error: error.message || String(error) };
      row.validation_status = 'manual_review_recommended';
      console.log(`[exercise-resolve] review failed for ${row.source_file}: ${error.message || error}`);
    }
  }

  if (bannedPairs.size > 0) {
    console.log(`[exercise-resolve] rerunning alignment with ${bannedPairs.size} banned pair(s)`);
    alignment = findBestAlignment(expected, matches, bannedPairs);
    const previousReviews = new Map();
    for (const row of plan) {
      if (row.review) {
        previousReviews.set(`${row.source_file}__${row.exercise_id}`, row.review);
      }
    }
    plan = buildInitialPlan(alignment, bannedPairs);
    for (const row of plan) {
      const review = previousReviews.get(`${row.source_file}__${row.exercise_id}`);
      if (!review) continue;
      row.review = review;
      const reviewConfidence = review.confidence <= 1 ? review.confidence * 100 : review.confidence;
      if (review.chosen_id === row.exercise_id && reviewConfidence >= 60) {
        row.validation_status = 'vision_confirmed';
      } else if (row.exercise_name === 'Shrugs' && review.chosen_name === 'Shrug') {
        row.validation_status = 'vision_plural_variant';
      } else {
        row.validation_status = 'manual_review_recommended';
      }
    }
    needsReview = plan.filter((row) => row.validation_status === 'needs_review' || row.score < 70);
    console.log(`[exercise-resolve] final missing exercises: ${alignment.missingExercises.map((row) => row.exercise_name).join(', ') || 'none'}`);
    console.log(`[exercise-resolve] final unused images: ${alignment.unusedImages.map((row) => row.file_name).join(', ') || 'none'}`);
    console.log(`[exercise-resolve] final suspicious rows: ${needsReview.length}`);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    expected_count: expected.length,
    image_count: matches.length,
    alignment_total_score: alignment.totalScore,
    missing_exercises: alignment.missingExercises,
    unused_images: alignment.unusedImages.map((row) => ({
      file_name: row.file_name,
      classifier_best_name: row.match?.best_match_name || null,
      classifier_detected_name: row.match?.detected_exercise_name || null,
      classifier_confidence: Number(row.match?.confidence || 0),
    })),
    suspicious_count: needsReview.length,
    confirmed_count: plan.filter((row) => row.validation_status === 'classifier_supported' || row.validation_status === 'vision_confirmed' || row.validation_status === 'vision_plural_variant').length,
    review_required_count: plan.filter((row) => row.validation_status === 'manual_review_recommended').length,
  };

  writeJson(OUTPUT_PATH, {
    summary,
    items: plan,
  });
  writeJson(REVIEW_PATH, {
    summary,
    items: plan.filter((row) => row.validation_status === 'manual_review_recommended'),
  });

  console.log(`[exercise-resolve] mapping: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
  console.log(`[exercise-resolve] review: ${path.relative(ROOT_DIR, REVIEW_PATH)}`);
}

main().catch((error) => {
  console.error('[exercise-resolve] failed');
  console.error(error.message || error);
  process.exit(1);
});
