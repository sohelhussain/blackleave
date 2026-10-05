const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function generateWithGemini({ prompt, verifiedContext, apiKey }) {
  if (!apiKey) throw new Error("Gemini API key is not configured.");
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}\n\nVerified profile data:\n${JSON.stringify(verifiedContext)}` }] }] })
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
