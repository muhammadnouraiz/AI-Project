import { useState } from "react";
import { explainCode } from "../api/explainService";

export default function useExplainCode() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  // Generate a unique ID for the chat session
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());

  const generateExplanation = async (code, language, mode, customPrompt) => {
    if (!code.trim()) return;

    // A new code submission means a brand new chat session
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setLoading(true);
    setHasSubmitted(true);
    setMessages([]);

    try {
      const data = await explainCode({ 
        code, 
        language, 
        mode, 
        session_id: newSessionId,
        custom_prompt: customPrompt 
      });
      
      if (data && data.explanation) {
        setMessages([{ role: "model", content: data.explanation }]);
      } else {
        setMessages([{ role: "model", content: "The AI returned an empty response." }]);
      }
    } catch (err) {
      setMessages([{ role: "error", content: err.message || "An unexpected error occurred. Please ensure your backend is running." }]);
    } finally {
      setLoading(false);
    }
  };

  const sendFollowUp = async (code, language, mode, userMessage) => {
    if (!userMessage.trim()) return;

    // Instantly append user's message to the UI
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const data = await explainCode({
        code,
        language,
        mode,
        session_id: sessionId,
        user_message: userMessage
      });

      if (data && data.explanation) {
        setMessages((prev) => [...prev, { role: "model", content: data.explanation }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "error", content: err.message || "Failed to get a response from the AI." }]);
    } finally {
      setLoading(false);
    }
  };

  const clearExplanation = () => {
    setMessages([]);
    setHasSubmitted(false);
    setLoading(false);
    // Reset session ID so the next generation starts a new memory thread
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