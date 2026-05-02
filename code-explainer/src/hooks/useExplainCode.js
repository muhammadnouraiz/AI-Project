import { useState } from "react";
import { explainCode } from "../api"; // Assuming you made src/api/index.js

export default function useExplainCode() {
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const generateExplanation = async (code, language, mode) => {
    if (!code.trim()) return;

    setLoading(true);
    setHasSubmitted(true);
    setOutput(null);

    try {
      // Calling our extracted API service
      const data = await explainCode({ code, language, mode });
      
      if (data && data.explanation) {
        setOutput(data.explanation);
      } else {
        setOutput("The AI returned an empty response.");
      }
    } catch (err) {
      setOutput(err.message || "An unexpected error occurred. Please ensure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const clearExplanation = () => {
    setOutput(null);
    setHasSubmitted(false);
    setLoading(false);
  };

  return {
    output,
    loading,
    hasSubmitted,
    generateExplanation,
    clearExplanation,
  };
}