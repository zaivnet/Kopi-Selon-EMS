import { Link } from 'react-router-dom';

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
      <h1 className="text-6xl font-bold text-destructive mb-4">500</h1>
      <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-8">An unexpected error occurred. Please try again later.</p>
      <Link 
        to="/" 
        className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Return Home
      </Link>
    </div>
  );
}
