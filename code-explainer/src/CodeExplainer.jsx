import { useState } from "react";

const LANGUAGES = [
  "Auto-Detect",
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "C",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
];

const MODES = [
  {
    id: "line_by_line",
    label: "Line-by-Line",
    description: "Explains each line individually",
  },
  {
    id: "step_by_step",
    label: "Step-by-Step",
    description: "Walks through the logic flow",
  },
  {
    id: "summary",
    label: "High-Level Summary",
    description: "Gives the overall purpose",
  },
];

export default function CodeExplainer() {
  const API_BASE_URL = "http://localhost:8000";
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Auto-Detect");
  const [mode, setMode] = useState("line_by_line");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleGenerate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setHasSubmitted(true);
    setOutput(null);

    try {
      const response = await fetch(`/api/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: code, 
          language: language, 
          mode: mode 
        }),
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // Keep default status-based message if response is not JSON.
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Our FastAPI returns { "explanation": "..." }
      if (data && data.explanation) {
        setOutput(data.explanation);
      } else {
        setOutput("The AI returned an empty response.");
      }

    } catch (err) {
      console.error("Fetch error:", err);
      if (err instanceof TypeError) {
        setOutput("Could not connect to the backend. Make sure your FastAPI server is running at http://localhost:8000");
      } else {
        setOutput(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode("");
    setOutput(null);
    setHasSubmitted(false);
    setLoading(false);
  };

  const selectedMode = MODES.find((m) => m.id === mode);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900 leading-tight">
                Code Explanation Assistant
              </h1>
              <p className="text-xs text-gray-400">AI-powered code comprehension</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
            Phase 1 UI Preview
          </span>
        </div>
      </header>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-5 h-full">

          {/* ── Left Panel: Input ── */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">

            {/* Panel header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Input
              </h2>
              <button
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Code textarea */}
            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here..."
                spellCheck={false}
                className="w-full h-72 sm:h-80 bg-gray-900 text-gray-100 text-sm font-mono leading-relaxed px-4 py-4 rounded-xl border border-gray-800 placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {code && (
                <span className="absolute bottom-3 right-3 text-xs text-gray-500">
                  {code.split("\n").length} lines
                </span>
              )}
            </div>

            {/* Controls row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Language selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Language
                </label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 text-gray-800 text-sm px-3 py-2.5 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Mode selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Explanation Mode
                </label>
                <div className="relative">
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 text-gray-800 text-sm px-3 py-2.5 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    {MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Mode description badge */}
            <p className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-2">
              <span className="font-medium text-gray-600">{selectedMode.label}:</span>{" "}
              {selectedMode.description}
            </p>

            {/* Submit button */}
            <button
              onClick={handleGenerate}
              disabled={!code.trim() || loading}
              className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Generate Explanation
                </>
              )}
            </button>
          </div>

          {/* ── Right Panel: Output ── */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">

            {/* Panel header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Explanation
              </h2>
              {output && (
                <button
                  onClick={() => navigator.clipboard.writeText(output)}
                  className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              )}
            </div>

            {/* Output area */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ minHeight: "420px" }}>

              {/* Empty state */}
              {!hasSubmitted && (
                <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    Your explanation will appear here
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Paste code on the left and click Generate
                  </p>
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm text-gray-400">Analyzing your code...</p>
                </div>
              )}

              {/* Output content */}
              {output && !loading && (
                <div className="h-full flex flex-col">
                  {/* Mode tag */}
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                      {selectedMode.label}
                    </span>
                    <span className="text-xs text-gray-400">{language}</span>
                  </div>

                  {/* Text output */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {output}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer note */}
            <p className="text-xs text-gray-400 text-center">
              Powered by Google Gemini 1.5. Built with React and FastAPI.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}