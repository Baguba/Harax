// Small shared helpers for API routes
export const OG = (title: string, cat: string) =>
  `/api/og?title=${encodeURIComponent(title)}&cat=${cat}&seed=${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}`;
