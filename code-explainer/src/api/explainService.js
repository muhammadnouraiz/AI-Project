/**
 * Sends code to the FastAPI backend to generate an explanation using Gemini.
 *
 * @param {Object} params
 * @param {string} params.code - The code snippet to explain.
 * @param {string} params.language - The programming language.
 * @param {string} params.mode - The explanation mode (e.g., "line_by_line").
 * @param {string} params.session_id - Unique session identifier.
 * @param {string} [params.custom_prompt] - Optional custom prompt.
 * @param {string} [params.user_message] - Optional follow-up message.
 * @returns {Promise<Object>} The API response containing the explanation.
 */
export const explainCode = async ({ code, language, mode, session_id, custom_prompt, user_message }) => {
  try {
    const payload = { code, language, mode, session_id };

    // Only include optional fields if they have a value
    if (custom_prompt) payload.custom_prompt = custom_prompt;
    if (user_message)  payload.user_message  = user_message;

    console.log("Sending payload:", payload); // 👈 helpful for debugging

    const response = await fetch('/api/explain', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.detail) {
          // FastAPI validation errors return an array of detail objects
          errorMessage = Array.isArray(errorData.detail)
            ? errorData.detail.map(e => e.msg).join(", ")
            : errorData.detail;
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
    throw err;
  }
};