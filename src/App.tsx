import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PageLayout } from "./components/layout/PageLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { OnboardingTourProvider } from "./contexts/OnboardingTourContext";
import { HomePage } from "./pages/HomePage";
import { MapPage } from "./pages/MapPage";
import { ReportPage } from "./pages/ReportPage";
import { AlertsPage } from "./pages/AlertsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AuthPage } from "./pages/AuthPage";
import { AboutPage } from "./pages/AboutPage";

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <OnboardingTourProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route element={<PageLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/map" element={<MapPage />} />
                <Route
                  path="/report"
                  element={
                    <ProtectedRoute>
                      <ReportPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </OnboardingTourProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
