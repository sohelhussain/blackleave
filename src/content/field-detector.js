export function detectFields(root = document) {
  return [...root.querySelectorAll("input, textarea, select")]
    .filter((element) => !element.disabled && !element.readOnly && element.type !== "hidden" && element.type !== "password")
    .map((element, index) => ({
      id: element.id || `profile-autofill-${index}`,
      label: getLabel(element), name: element.name || "", placeholder: element.placeholder || "",
      tagName: element.tagName.toLowerCase(), type: element.type || "text"
    }));
}

function getLabel(element) {
  const explicit = element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
  return explicit?.textContent?.trim() || element.closest("label")?.textContent?.trim() || element.getAttribute("aria-label") || "";
}
