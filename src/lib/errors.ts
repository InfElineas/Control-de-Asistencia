export function getErrorMessage(error: unknown, fallback = 'Ha ocurrido un error inesperado'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
}
