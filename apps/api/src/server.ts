import { createApp } from './app.js';
import { CONFIG } from './config.js';

const app = createApp();

app.listen(CONFIG.PORT, () => {
  console.log(`[ApplyFlow API] Server running on http://localhost:${CONFIG.PORT}`);
  console.log(`[ApplyFlow API] Gemini integration ready (Key configured: ${Boolean(CONFIG.GEMINI_API_KEY)})`);
});

export { app };
