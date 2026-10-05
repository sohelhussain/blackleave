import { detectFields } from "./field-detector.js";
import { showReview } from "./review-ui.js";

function requestSuggestions() {
  const fields = detectFields();
  chrome.runtime.sendMessage({ type: "SUGGEST_ANSWERS", fields }, ({ suggestions } = {}) => {
    if (suggestions?.length) showReview(suggestions);
  });
}

chrome.runtime.onMessage.addListener((message) => { if (message.type === "OPEN_REVIEW") requestSuggestions(); });
