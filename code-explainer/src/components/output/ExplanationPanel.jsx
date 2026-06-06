import { useState, useRef, useEffect } from "react";
import { getSafeExplanationHtml } from "../../utils/formatters";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";

export default function ExplanationPanel({ 
  messages = [], 
  loading, 
  hasSubmitted, 
  selectedModeLabel, 
  language,
  onSendFollowUp
}) {
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCopy = (text) => {
    if (text) navigator.clipboard.writeText(text);
  };

  const handleSend = () => {
    if (chatInput.trim() && !loading) {
      onSendFollowUp(chatInput);
      setChatInput("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Explanation & Chat
        </h2>
      </div>

      {/* Output Display Area */}
      <div className="flex-1 min-h-[500px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
        
        {/* State 1: Empty */}
        {!hasSubmitted && !loading && messages.length === 0 && <EmptyState />}
        
        {/* State 2: Initial Loading */}
        {loading && messages.length === 0 && <LoadingState />}

        {/* State 3: Chat History & Interaction */}
        {(messages.length > 0 || (loading && messages.length > 0)) && (
          <div className="flex flex-col h-full absolute inset-0">
            {/* Header tags */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-blue-700 bg-blue-100/50 px-2.5 py-1 rounded-md">
                {selectedModeLabel}
              </span>
              <span className="text-xs font-medium text-gray-500">{language}</span>
            </div>

            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : msg.role === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                  }`}>
                    
                    {/* Copy Button for Model Responses */}
                    {msg.role === 'model' && (
                      <div className="flex justify-end mb-2">
                        <button onClick={() => handleCopy(msg.content)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    {msg.role === 'model' ? (
                      <div 
                        className="text-sm leading-relaxed font-sans prose prose-sm max-w-none" 
                        dangerouslySetInnerHTML={{ __html: getSafeExplanationHtml(msg.content) }} 
                      />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Inline Typing Indicator for Follow-up questions */}
              {loading && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex gap-1.5 items-center shadow-sm">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 shrink-0">
              <div className="relative flex items-center max-w-4xl mx-auto">
                <textarea
                  rows={1}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a follow-up question..."
                  disabled={loading}
                  className="w-full bg-white border border-gray-300 text-gray-800 text-sm pl-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none shadow-sm block disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSend}
                  disabled={!chatInput.trim() || loading}
                  className="absolute right-2 p-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}