import React from 'react';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Loader2 } from 'lucide-react';

interface SystemHeaderProps {
  className?: string;
}

export default function SystemHeader({ className = '' }: SystemHeaderProps) {
  const { config, loading } = useSystemConfig();

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo */}
      {config?.logo_url && (
        <div className="flex-shrink-0">
          <img
            src={config.logo_url}
            alt={config.system_name || 'Logo'}
            className="h-8 w-auto object-contain"
            style={{
              maxWidth: config.logo_width ? `${Math.min(config.logo_width, 200)}px` : '200px',
              maxHeight: config.logo_height ? `${Math.min(config.logo_height, 60)}px` : '60px'
            }}
          />
        </div>
      )}
      
      {/* Nome do Sistema */}
      <div className="flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">
          {config?.system_name || 'CredCar Finance'}
        </h1>
      </div>
    </div>
  );
}
