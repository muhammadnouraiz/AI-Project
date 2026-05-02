import Header from "./Header";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Header />
      
      {/* The main content area that centers everything */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {children}
      </main>
    </div>
  );
}