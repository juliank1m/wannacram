export interface Topic {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  topic_documents?: TopicDocument[];
}

export interface TopicDocument {
  document_id: string;
  added_at: string;
  document: {
    id: string;
    title: string;
    file_type: 'pdf' | 'docx' | 'pptx';
    created_at: string;
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export const AI_MODELS = ['claude-haiku', 'gpt-5.6-luna'] as const;

export type AIModel = (typeof AI_MODELS)[number];

export const DEFAULT_AI_MODEL: AIModel = 'claude-haiku';

/**
 * Lives here rather than in lib/ai.ts so client components can validate a model
 * without pulling the Anthropic and OpenAI SDKs into the browser bundle.
 */
export function isAIModel(value: unknown): value is AIModel {
  return typeof value === 'string' && (AI_MODELS as readonly string[]).includes(value);
}
