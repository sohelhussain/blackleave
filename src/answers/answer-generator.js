import { valueAtPath } from "../mapping/field-mapper.js";

export function generateVerifiedAnswer(field, mapping, profile) {
  if (!mapping.profileKey) return null;
  const value = valueAtPath(profile, mapping.profileKey);
  if (typeof value !== "string" || !value.trim()) return null;
  return { value: value.trim(), source: mapping.profileKey, verified: true };
}
