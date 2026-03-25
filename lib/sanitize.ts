// Strips common XSS vectors from AI-generated HTML before rendering.
// The content comes from Claude which is prompted to output specific classes only,
// but this guards against any unexpected script injection.
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, 'data-removed=')
}
