/**
 * Client-side canvas image preprocessor.
 * Converts raw screenshot files into clean, high-contrast, binarized/grayscale image streams.
 * Massively boosts OCR parsing accuracy and execution speeds.
 */
export function preprocessScoreboard(
  imageElement: HTMLImageElement,
  thresholdValue: number = 120
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageElement.src;

  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;

  // Draw original image
  ctx.drawImage(imageElement, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply Grayscale and Threshold filters
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Compute luminance
    const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;

    // Apply binarized threshold (boost contrast)
    const binarized = grayscale >= thresholdValue ? 255 : 0;

    data[i] = binarized;     // Red
    data[i + 1] = binarized; // Green
    data[i + 2] = binarized; // Blue
    // Alpha data[i+3] remains unchanged
  }

  ctx.putImageData(imageData, 0, 0);

  // Return base64 processed image URL for Tesseract
  return canvas.toDataURL("image/png");
}
