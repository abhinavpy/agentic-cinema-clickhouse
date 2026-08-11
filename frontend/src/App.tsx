import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ChurnRisk from "./pages/ChurnRisk";
import Copilot from "./pages/Copilot";

function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/churn-risk" element={<ChurnRisk />} />
          <Route path="/copilot" element={<Copilot />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
