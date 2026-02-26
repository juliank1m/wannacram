function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

export function getUserFriendlyAiError(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes('credit balance is too low') ||
    message.includes('plans & billing')
  ) {
    return 'AI features are temporarily unavailable right now. Please try again later.';
  }

  if (message.includes('rate limit')) {
    return 'Too many requests right now. Please wait a moment and try again.';
  }

  if (
    message.includes('api key') ||
    message.includes('authentication') ||
    message.includes('unauthorized')
  ) {
    return 'AI service is currently unavailable. Please try again later.';
  }

  return 'Something went wrong while generating content. Please try again.';
}
