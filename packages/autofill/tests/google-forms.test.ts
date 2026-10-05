import test from 'node:test';
import assert from 'node:assert';
import { mapFieldToProfile } from '../dist/mapper.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import type { DetectedField } from '@applyflow/types';

function createField(label: string, fieldType: DetectedField['fieldType'] = 'text'): DetectedField {
  return {
    id: `f_${Math.random().toString(36).substring(2, 7)}`,
    selector: 'input',
    detectedLabel: label,
    fieldType,
    isRequired: false,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };
}

test('Google Form Question 1: Full Name -> Deterministic High Confidence', () => {
  const field = createField('Full Name');
  const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);

  assert.strictEqual(mapped.suggestedValue, 'Sohel Hussain');
  assert.strictEqual(mapped.confidenceLevel, 'HIGH');
  assert.strictEqual(mapped.source, 'deterministic');
  assert.strictEqual(mapped.suggestedProfileField, 'personal.fullName');
  assert.strictEqual(mapped.category, 'PERSONAL');
});

test('Google Form Question 2: Email Address -> Deterministic High Confidence', () => {
  const field = createField('Email Address', 'email');
  const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);

  assert.strictEqual(mapped.suggestedValue, 'sohelhussaing@gmail.com');
  assert.strictEqual(mapped.confidenceLevel, 'HIGH');
  assert.strictEqual(mapped.source, 'deterministic');
  assert.strictEqual(mapped.suggestedProfileField, 'personal.email');
  assert.strictEqual(mapped.category, 'PERSONAL');
});

test('Google Form Question 3: Phone Number -> Deterministic High Confidence', () => {
  const field = createField('Phone Number', 'tel');
  const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);

  assert.strictEqual(mapped.suggestedValue, '+91 9694428769');
  assert.strictEqual(mapped.confidenceLevel, 'HIGH');
  assert.strictEqual(mapped.source, 'deterministic');
  assert.strictEqual(mapped.suggestedProfileField, 'personal.phone');
  assert.strictEqual(mapped.category, 'PERSONAL');
});

test('Google Form Question 4: "If selected, how soon would you be able to join?" -> AVAILABILITY 15 days High Confidence', () => {
  const field = createField('If selected, how soon would you be able to join?');
  const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);

  assert.strictEqual(mapped.suggestedValue, '15 days');
  assert.strictEqual(mapped.confidenceLevel, 'HIGH');
  assert.strictEqual(mapped.source, 'deterministic');
  assert.strictEqual(mapped.suggestedProfileField, 'jobPreferences.noticePeriod');
  assert.strictEqual(mapped.category, 'AVAILABILITY');
});

test('Additional Availability Variants -> Correctly map to noticePeriod', () => {
  const variants = [
    'How soon can you join?',
    'When can you join?',
    'When can you start?',
    'What is your notice period?',
    'Availability to start',
    'Earliest joining date',
    'How many days notice do you need?'
  ];

  for (const v of variants) {
    const field = createField(v);
    const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);
    assert.strictEqual(mapped.suggestedValue, '15 days', `Failed for variant: ${v}`);
    assert.strictEqual(mapped.confidenceLevel, 'HIGH', `Failed confidence for: ${v}`);
    assert.strictEqual(mapped.source, 'deterministic');
    assert.strictEqual(mapped.suggestedProfileField, 'jobPreferences.noticePeriod');
  }
});

test('Google Form Question 5: "Why are you interested in Product Management?" -> ROLE_MOTIVATION AI Review', () => {
  const field = createField('Why are you interested in Product Management?', 'textarea');
  const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);

  assert.strictEqual(mapped.category, 'ROLE_MOTIVATION');
  assert.strictEqual(mapped.source, 'ai');
  assert.strictEqual(mapped.confidenceLevel, 'MEDIUM');
  assert.strictEqual(mapped.requiresConfirmation, true);
});

test('Role Motivation Variants -> Correctly classified as ROLE_MOTIVATION', () => {
  const variants = [
    'Why are you interested in this position?',
    'Why do you want this role?',
    'Interest in Product Management',
    'Why are you interested in software engineering?'
  ];

  for (const v of variants) {
    const field = createField(v, 'textarea');
    const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);
    assert.strictEqual(mapped.category, 'ROLE_MOTIVATION', `Failed category for: ${v}`);
    assert.strictEqual(mapped.source, 'ai');
    assert.strictEqual(mapped.confidenceLevel, 'MEDIUM');
    assert.strictEqual(mapped.requiresConfirmation, true);
  }
});

test('Google Form Question 6: "Anything else you would like us to know?" -> UNKNOWN Low Confidence Manual Input', () => {
  const field = createField('Anything else you would like us to know?', 'textarea');
  const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);

  assert.strictEqual(mapped.category, 'UNKNOWN');
  assert.strictEqual(mapped.source, 'unmapped');
  assert.strictEqual(mapped.confidenceLevel, 'LOW');
  assert.strictEqual(mapped.requiresConfirmation, true);
  assert.strictEqual(mapped.suggestedValue, null);
});

test('Generic Open-Ended Variants -> Kept as UNKNOWN for manual handling', () => {
  const variants = [
    'Additional information',
    'Additional comments',
    'Any other comments',
    'Anything else'
  ];

  for (const v of variants) {
    const field = createField(v, 'textarea');
    const mapped = mapFieldToProfile(field, INITIAL_SOHEL_PROFILE);
    assert.strictEqual(mapped.category, 'UNKNOWN', `Failed category for: ${v}`);
    assert.strictEqual(mapped.source, 'unmapped');
    assert.strictEqual(mapped.confidenceLevel, 'LOW');
    assert.strictEqual(mapped.suggestedValue, null);
  }
});
