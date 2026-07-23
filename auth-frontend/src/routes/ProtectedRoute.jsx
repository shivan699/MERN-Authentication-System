import { Navigate } from 'react-router-dom';

// Guards routes that require an authenticated session. If there's no
// access token in localStorage, the user is bounced back to the auth
// page — always via client-side navigation, never a full page reload,
// so we stay on the exact same Vercel deployment URL.
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/" replace />;
  return children;
}