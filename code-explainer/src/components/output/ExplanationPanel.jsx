import { getSafeExplanationHtml } from "../../utils/formatters";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";

export default function ExplanationPanel({ 
  output, 
  loading, 
  hasSubmitted, 
  selectedModeLabel, 
  language 
}) {
  
  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Explanation
        </h2>
        {output && !loading && (
          <button
            onClick={handleCopy}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Output
          </button>
        )}
      </div>

      {/* Output Display Area */}
      <div className="flex-1 min-h-87.5 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
        
        {/* Render Modular States */}
        {!hasSubmitted && !loading && !output && <EmptyState />}
        {loading && <LoadingState />}

        {/* State 3: Success Output */}
        {output && !loading && (
          <div className="flex flex-col h-full absolute inset-0">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-blue-700 bg-blue-100/50 px-2.5 py-1 rounded-md">
                {selectedModeLabel}
              </span>
              <span className="text-xs font-medium text-gray-500">{language}</span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div
                className="text-sm text-gray-700 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{
                  __html: getSafeExplanationHtml(output),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}