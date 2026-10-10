import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { trpcClient, queryClient } from '@/lib/trpcClient';
import { AuthProvider, useAuth } from '@/lib/authContext';
import LoginPage from '@/components/auth/LoginPage';
import { AuthenticatedDashboard } from '@/components/dashboard/AuthenticatedDashboard';

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedDashboard />;
}

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
