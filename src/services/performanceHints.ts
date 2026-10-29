const prefetchedDocuments = new Set<string>();

export function prefetchGameDocument(path: string): void {
  if (!path.startsWith('/') || prefetchedDocuments.has(path) || typeof document === 'undefined') return;
  prefetchedDocuments.add(path);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'document';
  link.href = `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
  document.head.appendChild(link);
}
