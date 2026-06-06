import { useState, useRef } from "react";
import { explainCode } from "../api/explainService";

export default function useExplainCode() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());

  // Store the original code so follow-ups can always send it to the backend
  const originalCodeRef = useRef("");

  const generateExplanation = async (code, language, mode, customPrompt) => {
    if (!code.trim()) return;

    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setLoading(true);
    setHasSubmitted(true);

    // Save the code for all future follow-up calls in this session
    originalCodeRef.current = code;

    // Show the user's pasted code as a user bubble immediately
    setMessages([{ role: "user", content: code }]);

    try {
      const data = await explainCode({
        code,
        language,
        mode,
        session_id: newSessionId,
        custom_prompt: customPrompt,
      });

      if (data && data.explanation) {
        setMessages([
          { role: "user", content: code },
          { role: "model", content: data.explanation },
        ]);
      } else {
        setMessages([
          { role: "user", content: code },
          { role: "model", content: "The AI returned an empty response." },
        ]);
      }
    } catch (err) {
      setMessages([
        { role: "user", content: code },
        {
          role: "error",
          content:
            err.message ||
            "An unexpected error occurred. Please ensure your backend is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendFollowUp = async (language, mode, userMessage) => {
    if (!userMessage.trim()) return;

    // Always send the original code — backend requires it to be non-empty
    const code = originalCodeRef.current;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const data = await explainCode({
        code,
        language,
        mode,
        session_id: sessionId,
        user_message: userMessage,
      });

      if (data && data.explanation) {
        setMessages((prev) => [
          ...prev,
          { role: "model", content: data.explanation },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          content: err.message || "Failed to get a response from the AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearExplanation = () => {
    setMessages([]);
    setHasSubmitted(false);
    setLoading(false);
    originalCodeRef.current = "";
    setSessionId(crypto.randomUUID());
  };

  return {
    messages,
    loading,
    hasSubmitted,
    generateExplanation,
    sendFollowUp,
    clearExplanation,
  };
}