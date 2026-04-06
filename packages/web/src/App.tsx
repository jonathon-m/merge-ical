import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.tsx";
import GroupDashboard from "./pages/GroupDashboard.tsx";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-parchment-50 to-parchment-200">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/group/:shareSecret" element={<GroupDashboard />} />
      </Routes>
    </div>
  );
}
