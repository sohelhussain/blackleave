import test from 'node:test';
import assert from 'node:assert';
import { mapFieldToProfile } from '../dist/mapper.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import type { DetectedField } from '@applyflow/types';

test('Deterministic Mapping - First Name with High Confidence', () => {
  const dummyField: DetectedField = {
    id: 'f1',
    selector: '#first_name',
    detectedLabel: 'First Name',
    fieldType: 'text',
    isRequired: true,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };

  const mapped = mapFieldToProfile(dummyField, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mapped.suggestedValue, 'Sohel');
  assert.strictEqual(mapped.confidenceLevel, 'HIGH');
  assert.strictEqual(mapped.suggestedProfileField, 'personal.firstName');
});

test('Deterministic Mapping - Email Address with High Confidence', () => {
  const dummyField: DetectedField = {
    id: 'f2',
    selector: '#email',
    detectedLabel: 'Email address',
    fieldType: 'email',
    isRequired: true,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };

  const mapped = mapFieldToProfile(dummyField, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mapped.suggestedValue, 'sohelhussaing@gmail.com');
  assert.strictEqual(mapped.confidenceLevel, 'HIGH');
  assert.strictEqual(mapped.category, 'PERSONAL');
});

test('Deterministic Mapping - Work Authorization for US', () => {
  const dummyField: DetectedField = {
    id: 'f3',
    selector: 'input[name="us_auth"]',
    detectedLabel: 'Are you legally authorized to work in the United States?',
    fieldType: 'radio',
    isRequired: true,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };

  const mapped = mapFieldToProfile(dummyField, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mapped.suggestedValue, 'Yes');
  assert.strictEqual(mapped.confidenceLevel, 'HIGH');
  assert.strictEqual(mapped.category, 'WORK_AUTHORIZATION');
});

test('Ambiguous Field - Classifies as AI requiring review', () => {
  const dummyField: DetectedField = {
    id: 'f4',
    selector: 'textarea#project',
    detectedLabel: "Tell us about a project you're proud of.",
    fieldType: 'textarea',
    isRequired: false,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };

  const mapped = mapFieldToProfile(dummyField, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mapped.confidenceLevel, 'MEDIUM');
  assert.strictEqual(mapped.source, 'ai');
  assert.strictEqual(mapped.requiresConfirmation, true);
  assert.strictEqual(mapped.category, 'PROJECT');
});

test('Demographic Field - Never inferred, marked LOW confidence for manual entry', () => {
  const dummyField: DetectedField = {
    id: 'f5',
    selector: 'select#veteran',
    detectedLabel: 'Are you a protected veteran?',
    fieldType: 'select',
    isRequired: false,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };

  const mapped = mapFieldToProfile(dummyField, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mapped.confidenceLevel, 'LOW');
  assert.strictEqual(mapped.suggestedValue, null);
  assert.strictEqual(mapped.category, 'DEMOGRAPHIC');
  assert.strictEqual(mapped.source, 'manual');
});
