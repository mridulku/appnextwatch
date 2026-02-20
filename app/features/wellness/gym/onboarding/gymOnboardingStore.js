import { useEffect, useState } from 'react';

const DEFAULT_DRAFT = {
  goal: null,
  frequency: null,
  experience: null,
  sessionLength: null,
  splitPreference: null,
  constraints: [],
};

const storeState = {
  draft: { ...DEFAULT_DRAFT },
  onboardingCompleted: false,
  updatedAt: Date.now(),
};

const listeners = new Set();

function emit() {
  storeState.updatedAt = Date.now();
  listeners.forEach((listener) => listener(storeState));
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getOnboardingState() {
  return {
    draft: { ...storeState.draft, constraints: [...storeState.draft.constraints] },
    onboardingCompleted: storeState.onboardingCompleted,
    updatedAt: storeState.updatedAt,
  };
}

function setSingleAnswer(key, value) {
  storeState.draft = { ...storeState.draft, [key]: value };
  emit();
}

function toggleConstraint(value) {
  const prev = Array.isArray(storeState.draft.constraints) ? storeState.draft.constraints : [];
  const exists = prev.includes(value);
  storeState.draft = {
    ...storeState.draft,
    constraints: exists ? prev.filter((item) => item !== value) : [...prev, value],
  };
  emit();
}

function completeOnboarding() {
  storeState.onboardingCompleted = true;
  emit();
}

function resetOnboarding() {
  storeState.draft = { ...DEFAULT_DRAFT };
  storeState.onboardingCompleted = false;
  emit();
}

function useGymOnboardingState() {
  const [state, setState] = useState(() => getOnboardingState());

  useEffect(() => subscribe(() => setState(getOnboardingState())), []);

  return {
    ...state,
    setSingleAnswer,
    toggleConstraint,
    completeOnboarding,
    resetOnboarding,
  };
}

export {
  DEFAULT_DRAFT,
  completeOnboarding,
  getOnboardingState,
  resetOnboarding,
  setSingleAnswer,
  toggleConstraint,
  useGymOnboardingState,
};

