"use client";
import React from 'react';
import SolanaProvider from '@/components/providers/SolanaProvider';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SolanaProvider>
      {children}
    </SolanaProvider>
  );
}
