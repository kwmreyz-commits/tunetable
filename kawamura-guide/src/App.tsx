import JourneyPage from "./pages/JourneyPage";
import PlanBuilderPage from "./pages/PlanBuilderPage";
import PlanViewPage from "./pages/PlanViewPage";

// ページは3つだけなので、ライブラリを使わず URL で切り替える
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/plan/new") return <PlanBuilderPage />;
  if (path === "/plan") return <PlanViewPage />;
  return <JourneyPage />;
}
