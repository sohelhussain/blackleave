import { getProfile } from "../shared/profile-schema.js";
import { mapField } from "../mapping/field-mapper.js";
import { generateVerifiedAnswer } from "../answers/answer-generator.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "SUGGEST_ANSWERS") return;
  getProfile().then((profile) => {
    const suggestions = message.fields.map((field) => {
      const mapping = mapField(field);
      return { fieldId: field.id, mapping, answer: generateVerifiedAnswer(field, mapping, profile) };
    }).filter((item) => item.answer);
    sendResponse({ suggestions });
  });
  return true;
});
