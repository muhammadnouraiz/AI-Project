import Header from "./Header";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      <Header />
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}