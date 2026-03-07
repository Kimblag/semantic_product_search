import "./App.css";

function App() {
  return (
    <main className="min-h-screen bg-dust-grey-700 p-8 text-pine-teal-200">
      <section className="mx-auto max-w-xl rounded-2xl border border-pine-teal-700 bg-pine-teal-500 p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-dry-sage-900">
          Tailwind Palette Working
        </h1>
        <p className="mt-3 text-fern-900">
          I can see the colors
        </p>
        <button
          type="button"
          className="mt-6 rounded-lg bg-hunter-green-700 px-4 py-2 font-semibold text-dust-grey-900 transition-colors hover:bg-hunter-green-800"
        >
          Test color button
        </button>
      </section>
    </main>
  );
}

export default App;
