import { createRoot } from "react-dom/client";
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from "./app/routes.tsx";
import { AuthProvider } from "./app/hooks/useAuth";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);
  