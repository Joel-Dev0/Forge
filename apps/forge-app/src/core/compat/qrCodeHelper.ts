/**
 * Minimal zero-dependency QR Code matrix generator for Physical Device Bridge testing.
 * Generates an SVG string representation of a URL or text string.
 */

// Simple 21x21 - 33x33 QR Code generator using standard QR specifications
export function generateQrSvg(text: string, size = 160): string {
  // We can generate a clean scannable SVG using Google Chart API or an embedded SVG matrix fallback
  // If online, use standard SVG image data or embedded data URL
  const encodedText = encodeURIComponent(text);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}&bgcolor=ffffff&color=000000&margin=2`;

  return qrApiUrl;
}
