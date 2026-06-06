import { useState } from "react";
import useExplainCode from "../hooks/useExplainCode";
import { MODES } from "../utils/constants";

// Layout & UI
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";

// Panels
import CodeInputPanel from "../components/input/CodeInputPanel";
import ControlsRow from "../components/input/ControlsRow";
import ExplanationPanel from "../components/output/ExplanationPanel";

export default function Home() {
  // Local UI State
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Auto-Detect");
  const [mode, setMode] = useState("line_by_line");
  const [customPrompt, setCustomPrompt] = useState("");

  // Business Logic from Hook
  const { 
    messages, 
    loading, 
    hasSubmitted, 
    generateExplanation,
    sendFollowUp, 
    clearExplanation 
  } = useExplainCode();

  // Derived state
  const selectedModeLabel = MODES.find((m) => m.id === mode)?.label || mode;

  // Handlers
  const handleGenerate = () => generateExplanation(code, language, mode, customPrompt);
  
  const handleSendFollowUp = (userMessage) => {
    sendFollowUp(code, language, mode, userMessage);
  };

  const handleClear = () => {
    setCode("");
    setCustomPrompt("");
    clearExplanation();
  };

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* Left Side: Input Flow */}
        <div className="w-full lg:w-1/2 flex flex-col gap-5">
          <CodeInputPanel 
            code={code} 
            setCode={setCode} 
            onClear={handleClear} 
          />
          <ControlsRow 
            language={language} 
            setLanguage={setLanguage} 
            mode={mode} 
            setMode={setMode}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt} 
          />
          <Button 
            onClick={handleGenerate} 
            // Prevent generation if code is empty OR if custom mode is selected but prompt is empty
            disabled={!code.trim() || (mode === 'custom' && !customPrompt.trim())} 
            loading={loading && messages.length === 0}
          >
            {loading && messages.length === 0 ? "Analyzing Code..." : "Generate Explanation"}
          </Button>
        </div>

        {/* Right Side: Output Flow (Chat Interface) */}
        <div className="w-full lg:w-1/2">
          <ExplanationPanel 
            messages={messages}
            loading={loading}
            hasSubmitted={hasSubmitted}
            selectedModeLabel={selectedModeLabel}
            language={language}
            onSendFollowUp={handleSendFollowUp}
          />
        </div>

      </div>
    </MainLayout>
  );
}