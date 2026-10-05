const rules = [
  { key: "personal.firstName", terms: ["first name", "given name", "fname"] },
  { key: "personal.lastName", terms: ["last name", "family name", "surname", "lname"] },
  { key: "personal.email", terms: ["email", "e-mail"] },
  { key: "personal.phone", terms: ["phone", "mobile", "telephone"] },
  { key: "personal.location", terms: ["location", "city", "address"] },
  { key: "links.linkedin", terms: ["linkedin"] },
  { key: "links.github", terms: ["github"] },
  { key: "links.portfolio", terms: ["portfolio", "personal website", "website"] }
];

export function mapField(field) {
  const label = `${field.label} ${field.name} ${field.placeholder}`.toLowerCase();
  const match = rules.find(({ terms }) => terms.some((term) => label.includes(term)));
  return match ? { profileKey: match.key, confidence: 0.95 } : { profileKey: null, confidence: 0 };
}

export function valueAtPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}
