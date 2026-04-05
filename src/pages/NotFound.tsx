import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404: rota não encontrada:", location.pathname);
    // Auto-redirect to dashboard after 3s
    const timer = setTimeout(() => navigate("/", { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [location.pathname, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-8xl font-bold text-primary">404</h1>
        <p className="text-xl text-muted-foreground">Página não encontrada</p>
        <p className="text-sm text-muted-foreground">Redirecionando em 3 segundos...</p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
};

export default NotFound;
