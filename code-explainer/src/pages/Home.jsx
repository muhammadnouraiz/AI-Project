import { useState } from "react";
import useExplainCode from "../hooks/useExplainCode";
import { MODES } from "../utils/constants";
import MainLayout from "../components/layout/MainLayout";
import ExplanationPanel from "../components/output/ExplanationPanel";

export default function Home() {
  const [language, setLanguage] = useState("Auto-Detect");
  const [mode, setMode] = useState("custom");
  const [customPrompt, setCustomPrompt] = useState("");

  const {
    messages,
    loading,
    hasSubmitted,
    generateExplanation,
    sendFollowUp,
    clearExplanation,
  } = useExplainCode();

  const selectedModeLabel = MODES.find((m) => m.id === mode)?.label || mode;

  const handleGenerate = (userText) => {
    generateExplanation(userText, language, mode, mode === "custom" ? customPrompt : "");
  };

  // No longer passes code — the hook stores it internally
  const handleSendFollowUp = (userMessage) => {
    sendFollowUp(language, mode, userMessage);
  };

  const handleNewChat = () => {
    clearExplanation();
    setCustomPrompt("");
  };

  return (
    <MainLayout>
      <ExplanationPanel
        messages={messages}
        loading={loading}
        hasSubmitted={hasSubmitted}
        selectedModeLabel={selectedModeLabel}
        language={language}
        setLanguage={setLanguage}
        mode={mode}
        setMode={setMode}
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        onGenerate={handleGenerate}
        onSendFollowUp={handleSendFollowUp}
        onNewChat={handleNewChat}
      />
    </MainLayout>
  );
}