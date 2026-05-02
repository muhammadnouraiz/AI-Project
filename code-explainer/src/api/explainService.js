/**
 * Sends code to the FastAPI backend to generate an explanation using Gemini.
 * 
 * @param {Object} params 
 * @param {string} params.code - The code snippet to explain.
 * @param {string} params.language - The programming language.
 * @param {string} params.mode - The explanation mode (e.g., "line_by_line").
 * @returns {Promise<Object>} The API response containing the explanation.
 */
export const explainCode = async ({ code, language, mode }) => {
  try {
    const response = await fetch('/api/explain', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, mode }),
    });

    if (!response.ok) {
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        // FastAPI sends errors in a "detail" field
        if (errorData?.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        // Fallback to default status message if response isn't JSON
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
    
  } catch (err) {
    console.error("Explain Service Error:", err);
    // Rethrow so the UI component can catch it and display it to the user
    throw err; 
  }
};