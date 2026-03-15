import "./App.css";
import { Toaster } from "./components/ui/sonner";
import { AppRouter } from "./router/router";

function App() {
  return (
    <>
      <AppRouter />
      <Toaster richColors position="top-right" />
    </>
  );
}

export default App;
