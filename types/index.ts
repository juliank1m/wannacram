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

export type AIModel = 'claude-sonnet' | 'gpt-4o-mini' | 'gpt-5-mini';
