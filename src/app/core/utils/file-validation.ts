export const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024;

const FORBIDDEN_EXTENSIONS = new Set(['exe', 'bat']);

export function validateSelectedFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'La taille maximale autorisée est de 1 Go.';
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && FORBIDDEN_EXTENSIONS.has(extension)) {
    return `Les fichiers .${extension} ne sont pas autorisés.`;
  }

  return null;
}
