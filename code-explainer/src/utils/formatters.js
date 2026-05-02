import DOMPurify from "dompurify";

/**
 * Safely parses and normalizes HTML from the AI explanation,
 * specifically converting Gemini's inline styles to Tailwind CSS classes
 * for the Red/Green bug highlights.
 */
export const getSafeExplanationHtml = (rawExplanation) => {
  if (!rawExplanation) return "";

  // Normalize expected AI style spans into modern Tailwind classes
  const normalized = rawExplanation
    .replace(
      /<span\s+style\s*=\s*['"]\s*color\s*:\s*red\s*;\s*text-decoration\s*:\s*line-through\s*;?\s*['"]\s*>/gi,
      '<span class="text-red-500 line-through bg-red-50 px-1.5 py-0.5 rounded-md">'
    )
    .replace(
      /<span\s+style\s*=\s*['"]\s*color\s*:\s*green\s*;\s*font-weight\s*:\s*bold\s*;?\s*['"]\s*>/gi,
      '<span class="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-md">'
    )
    .replace(
      /<span\s+style\s*=\s*['"]\s*color\s*:\s*red\s*;\s*font-weight\s*:\s*bold\s*;?\s*['"]\s*>/gi,
      '<span class="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded-md">'
    )
    // Fallback: highlight plain [FIX: ...] suggestions even if the AI forgets the HTML tags
    .replace(
      /\[FIX:\s*([^\]]+?)\]/gi, 
      '<span class="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-md shadow-sm">[FIX: $1]</span>'
    )
    // Convert newlines to HTML breaks
    .replace(/\r?\n/g, "<br />");

  // Sanitize the final output
  return DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS: ["span", "br", "strong", "em", "code", "pre"],
    ALLOWED_ATTR: ["class"], // Only allow our safe Tailwind classes
  });
};