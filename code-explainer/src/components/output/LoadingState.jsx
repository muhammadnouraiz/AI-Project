export default function LoadingState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-xl">
      <div className="flex gap-2 mb-4">
        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: "0ms" }} />
        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: "150ms" }} />
        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: "300ms" }} />
      </div>
      <p className="text-sm font-medium text-gray-500 animate-pulse tracking-wide">
        Analyzing with Gemini 1.5...
      </p>
    </div>
  );
}