import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './hooks/useAuth.tsx';
import { AppDialogProvider } from './hooks/useAppDialog.tsx';
import { ConfigErrorScreen } from './components/ConfigErrorScreen.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { isSupabaseConfigured } from './lib/supabaseConfig.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isSupabaseConfigured() ? (
        <AppDialogProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppDialogProvider>
      ) : (
        <ConfigErrorScreen />
      )}
    </ErrorBoundary>
  </StrictMode>,
);
