export default function CodeInputPanel({ code, setCode, onClear }) {
  const lineCount = code ? code.split("\n").length : 0;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Code Input
        </h2>
        <button
          onClick={onClear}
          className="text-xs font-medium text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Clear Editor
        </button>
      </div>

      {/* Text Area */}
      <div className="relative flex-1 min-h-87.5">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          spellCheck={false}
          className="w-full h-full absolute inset-0 bg-[#0d1117] text-gray-100 text-sm font-mono leading-relaxed p-5 rounded-xl border border-gray-800 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-inner transition-all"
        />
        
        {/* Dynamic Line Counter Badge */}
        {code && (
          <div className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm text-gray-400 text-xs px-2.5 py-1 rounded-md border border-gray-700 pointer-events-none">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </div>
        )}
      </div>
    </div>
  );
}