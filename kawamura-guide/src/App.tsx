import JourneyPage from "./pages/JourneyPage";
import PlanBuilderPage from "./pages/PlanBuilderPage";
import PlanViewPage from "./pages/PlanViewPage";
import SettingsPage from "./pages/SettingsPage";

// ページは4つだけなので、ライブラリを使わず URL で切り替える
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/plan/new") return <PlanBuilderPage />;
  if (path === "/plan") return <PlanViewPage />;
  if (path === "/settings") return <SettingsPage />;
  return <JourneyPage />;
}
