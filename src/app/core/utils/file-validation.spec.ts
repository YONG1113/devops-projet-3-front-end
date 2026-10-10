import { MAX_FILE_SIZE_BYTES, validateSelectedFile } from './file-validation';

describe('validateSelectedFile', () => {
  it.each(['program.exe', 'SCRIPT.BAT'])(
    'rejects the forbidden file %s',
    (name) => expect(validateSelectedFile(new File(['content'], name))).toContain('ne sont pas autorisés'),
  );

  it('rejects files larger than 1 GiB', () => {
    const file = new File(['content'], 'archive.zip');
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE_BYTES + 1 });
    expect(validateSelectedFile(file)).toBe('La taille maximale autorisée est de 1 Go.');
  });

  it('accepts an allowed file of exactly 1 GiB', () => {
    const file = new File(['content'], 'archive.zip');
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE_BYTES });
    expect(validateSelectedFile(file)).toBeNull();
  });
});
