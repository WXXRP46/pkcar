import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Crown } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <a href="/" className="flex items-center gap-2.5 p-5 cursor-pointer w-fit">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
          <Crown className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-foreground">GOLDMINE_TRAVEL</p>
        </div>
      </a>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
