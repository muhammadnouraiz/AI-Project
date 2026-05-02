export default function Button({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false, 
  variant = 'primary',
  className = '',
  ...props 
}) {
  // Base styles applied to all buttons
  const baseStyles = "w-full text-sm font-bold px-4 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2";
  
  // Design variants
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50 disabled:text-gray-400",
    outline: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className} disabled:cursor-not-allowed`}
      {...props}
    >
      {/* Automatic Loading Spinner */}
      {loading && (
        <svg className="w-4 h-4 animate-spin text-current opacity-70" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      
      {children}
    </button>
  );
}