import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Copilot from "./pages/Copilot";
import "./App.css";

function App() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/copilot" element={<Copilot />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
