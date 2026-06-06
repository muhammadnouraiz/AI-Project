import { useState, useRef, useEffect } from "react";
import { getSafeExplanationHtml } from "../../utils/formatters";
import { LANGUAGES, MODES } from "../../utils/constants";
import LoadingState from "./LoadingState";

export default function ExplanationPanel({
  messages = [],
  loading,
  hasSubmitted,
  selectedModeLabel,
  language,
  setLanguage,
  mode,
  setMode,
  customPrompt,
  setCustomPrompt,
  onGenerate,
  onSendFollowUp,
  onNewChat,
}) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [inputText]);

  const handleCopy = (text) => {
    if (text) navigator.clipboard.writeText(text);
  };

  const canSubmitFirst =
    inputText.trim() && !(mode === "custom" && !customPrompt.trim());

  const handleSubmit = () => {
    if (loading) return;
    if (!hasSubmitted) {
      if (!canSubmitFirst) return;
      onGenerate(inputText.trim());
      setInputText("");
    } else {
      if (!inputText.trim()) return;
      onSendFollowUp(inputText.trim());
      setInputText("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = !hasSubmitted && !loading && messages.length === 0;
  const isInitialLoading = loading && messages.length === 0;

  return (
    <div
      className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      style={{ height: "calc(100vh - 96px)" }}
    >
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">Code Explainer</span>

          {/* Session mode badge (shown after first submit) */}
          {hasSubmitted && (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
              {selectedModeLabel} · {language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasSubmitted && (
            <button
              onClick={onNewChat}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-all"
            >
              + New Chat
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400 font-medium">Gemini 1.5</span>
          </div>
        </div>
      </div>

      {/* ── CHAT BODY ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Empty / Welcome State */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center mb-5 border border-blue-100 shadow-sm">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Paste your code below to get started
            </h3>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Choose an explanation mode, paste your code into the input bar, and hit Enter. You can ask follow-up questions after the first response.
            </p>
          </div>
        )}

        {/* Initial Loading */}
        {isInitialLoading && (
          <div className="flex items-center justify-center h-full">
            <LoadingState />
          </div>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="flex flex-col gap-5 px-5 py-6 max-w-4xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Model avatar */}
                {(msg.role === "model" || msg.role === "error") && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm shadow-md"
                      : msg.role === "error"
                      ? "bg-red-50 text-red-700 border border-red-200 rounded-tl-sm"
                      : "bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {/* Copy button for model */}
                  {msg.role === "model" && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => handleCopy(msg.content)}
                        title="Copy"
                        className="text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {msg.role === "model" ? (
                    <div
                      className="prose prose-sm max-w-none font-sans"
                      dangerouslySetInnerHTML={{ __html: getSafeExplanationHtml(msg.content) }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {/* Follow-up typing indicator */}
            {loading && messages.length > 0 && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 flex gap-1.5 items-center shadow-sm">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ── BOTTOM INPUT AREA ── */}
      <div className="shrink-0 border-t border-gray-100 bg-gray-50/60 p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-2.5">

          {/* Controls row — only visible before first submit */}
          {!hasSubmitted && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              {/* Language dropdown */}
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-medium pl-3 pr-7 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer shadow-sm transition-all"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Mode pills */}
              <div className="flex gap-1.5 flex-wrap">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                      mode === m.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Custom prompt input */}
              {mode === "custom" && (
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Your instruction, e.g. Find security vulnerabilities..."
                  className="flex-1 min-w-[200px] bg-white border border-gray-200 text-gray-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 shadow-sm transition-all"
                />
              )}
            </div>
          )}

          {/* Main text input box */}
          <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:border-blue-400 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={
                !hasSubmitted
                  ? "Paste your code here and press Enter…"
                  : "Ask a follow-up question…"
              }
              className="flex-1 bg-transparent text-gray-800 text-sm resize-none focus:outline-none placeholder-gray-400 leading-relaxed disabled:cursor-not-allowed"
              style={{ minHeight: "24px", maxHeight: "180px" }}
            />
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                (!hasSubmitted && !canSubmitFirst) ||
                (hasSubmitted && !inputText.trim())
              }
              className={`p-2 rounded-lg transition-all shrink-0 ${
                (!loading &&
                  ((!hasSubmitted && canSubmitFirst) ||
                    (hasSubmitted && inputText.trim())))
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
            >
              {loading && !hasSubmitted ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-300">
            {hasSubmitted
              ? "Follow-up questions use the same session · Shift+Enter for new line"
              : "Shift+Enter for new line · Enter to send · Mode locked after first message"}
          </p>
        </div>
      </div>
    </div>
  );
}