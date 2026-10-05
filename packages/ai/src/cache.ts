import { AIAnswerResult } from '@applyflow/types';

class AnswerCache {
  private cache = new Map<string, AIAnswerResult>();

  private makeKey(question: string, role?: string, company?: string): string {
    return `${company || ''}::${role || ''}::${question.toLowerCase().trim()}`;
  }

  get(question: string, role?: string, company?: string): AIAnswerResult | undefined {
    return this.cache.get(this.makeKey(question, role, company));
  }

  set(question: string, result: AIAnswerResult, role?: string, company?: string): void {
    this.cache.set(this.makeKey(question, role, company), result);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const aiAnswerCache = new AnswerCache();
