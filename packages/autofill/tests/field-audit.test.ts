import test from 'node:test';
import assert from 'node:assert';
import { mapFieldToProfile } from '../dist/mapper.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import type { DetectedField } from '@applyflow/types';

function makeField(label: string, fieldType: DetectedField['fieldType'] = 'text'): DetectedField {
  return {
    id: `f_${Math.random()}`,
    selector: `input[name="${label.replace(/\s+/g, '_')}"]`,
    detectedLabel: label,
    fieldType,
    isRequired: true,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };
}

const AUDIT_FIELDS = [
  { field: 'First name', label: 'First Name', expectedVal: 'Sohel', expectedConf: 'HIGH' },
  { field: 'Last name', label: 'Last Name', expectedVal: 'Hussain', expectedConf: 'HIGH' },
  { field: 'Full name', label: 'Full Legal Name', expectedVal: 'Sohel Hussain', expectedConf: 'HIGH' },
  { field: 'Email', label: 'Email Address', expectedVal: 'sohelhussaing@gmail.com', expectedConf: 'HIGH' },
  { field: 'Phone', label: 'Phone Number', expectedVal: '+91 9694428769', expectedConf: 'HIGH' },
  { field: 'Address', label: 'Current Address', expectedVal: 'Bangalore, Karnataka, India - 560066', expectedConf: 'HIGH' },
  { field: 'City', label: 'City of Residence', expectedVal: 'Bangalore', expectedConf: 'HIGH' },
  { field: 'State', label: 'State / Province', expectedVal: 'Karnataka', expectedConf: 'HIGH' },
  { field: 'Country', label: 'Country', expectedVal: 'India', expectedConf: 'HIGH' },
  { field: 'Postal code', label: 'Postal Code / Pincode', expectedVal: '560066', expectedConf: 'HIGH' },
  { field: 'LinkedIn', label: 'LinkedIn Profile URL', expectedVal: 'https://www.linkedin.com/in/sohelhussain', expectedConf: 'HIGH' },
  { field: 'GitHub', label: 'GitHub Profile URL', expectedVal: 'https://github.com/sohelhussain', expectedConf: 'HIGH' },
  { field: 'Portfolio', label: 'Portfolio Website Link', expectedVal: 'https://sohelhussain.github.io/portfolio', expectedConf: 'HIGH' },
  { field: 'University', label: 'College / University Name', expectedVal: 'Jain University', expectedConf: 'HIGH' },
  { field: 'Degree', label: 'Highest Degree Obtained', expectedVal: 'Master of Computer Applications', expectedConf: 'HIGH' },
  { field: 'Graduation year', label: 'Expected Graduation Year', expectedVal: '2027', expectedConf: 'HIGH' },
  { field: 'Work authorization (US)', label: 'Are you legally authorized to work in the United States?', expectedVal: 'Yes', expectedConf: 'HIGH' },
  { field: 'Work authorization (India)', label: 'Are you legally authorized to work in India?', expectedVal: 'Yes', expectedConf: 'HIGH' },
  { field: 'Visa sponsorship', label: 'Will you now or in the future require visa sponsorship?', expectedVal: 'Yes', expectedConf: 'HIGH' },
  { field: 'Salary expectation', label: 'What is your expected salary?', expectedVal: null, expectedConf: 'LOW' }
];

test('Field Detection Audit - Verifies all 20 required audit fields map and fill accurately', () => {
  for (const item of AUDIT_FIELDS) {
    const f = makeField(item.label);
    const mapped = mapFieldToProfile(f, INITIAL_SOHEL_PROFILE);

    assert.strictEqual(
      mapped.confidenceLevel,
      item.expectedConf,
      `Field "${item.field}" (${item.label}) confidence mismatch. Got ${mapped.confidenceLevel}`
    );

    if (item.expectedVal !== null) {
      assert.strictEqual(
        mapped.suggestedValue,
        item.expectedVal,
        `Field "${item.field}" value mismatch. Got ${mapped.suggestedValue}`
      );
    } else {
      assert.strictEqual(
        mapped.suggestedValue,
        null,
        `Field "${item.field}" must be null for manual input.`
      );
    }
  }
});
