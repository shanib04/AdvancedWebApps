import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RegisterForm from "./components/RegisterForm";
import LoginForm from "./components/LoginForm";
import HomeScreen from "./components/HomeScreen";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const accessToken = localStorage.getItem("accessToken");
  const storedUser = localStorage.getItem("user");

  if (!accessToken || !storedUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomeScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
