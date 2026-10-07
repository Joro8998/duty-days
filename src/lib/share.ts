// Hand files to the share sheet, or save them as downloads.

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/** Opens the share sheet (Mail, Messages, Files…). Falls back to downloading if it can't. */
export async function shareFiles(
  files: File[],
  message: { title: string; text?: string },
): Promise<ShareOutcome> {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, ...message });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Anything else (e.g. NotAllowedError): fall through to downloading.
    }
  }
  downloadFiles(files);
  return 'downloaded';
}

export function downloadFiles(files: File[]): void {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
