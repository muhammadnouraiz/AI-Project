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

  // Business Logic from Hook
  const { 
    output, 
    loading, 
    hasSubmitted, 
    generateExplanation, 
    clearExplanation 
  } = useExplainCode();

  // Derived state
  const selectedModeLabel = MODES.find((m) => m.id === mode)?.label || mode;

  // Handlers
  const handleGenerate = () => generateExplanation(code, language, mode);
  const handleClear = () => {
    setCode("");
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
          />
          <Button 
            onClick={handleGenerate} 
            disabled={!code.trim()} 
            loading={loading}
          >
            {loading ? "Analyzing Code..." : "Generate Explanation"}
          </Button>
        </div>

        {/* Right Side: Output Flow */}
        <div className="w-full lg:w-1/2">
          <ExplanationPanel 
            output={output}
            loading={loading}
            hasSubmitted={hasSubmitted}
            selectedModeLabel={selectedModeLabel}
            language={language}
          />
        </div>

      </div>
    </MainLayout>
  );
}