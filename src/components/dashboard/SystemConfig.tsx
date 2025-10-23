import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Image, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { systemConfigService, SystemConfig, SystemConfigUpdate } from '@/lib/system-config.service';

interface SystemConfigProps {
  onConfigUpdate?: (config: SystemConfig) => void;
}

export default function SystemConfig({ onConfigUpdate }: SystemConfigProps) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [systemName, setSystemName] = useState('');
  const [systemDescription, setSystemDescription] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDimensions, setLogoDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSystemConfig();
  }, []);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      const systemConfig = await systemConfigService.getSystemConfig();
      
      if (systemConfig) {
        setConfig(systemConfig);
        setSystemName(systemConfig.system_name);
        setSystemDescription(systemConfig.system_description || '');
        
        if (systemConfig.logo_url) {
          setLogoPreview(systemConfig.logo_url);
          if (systemConfig.logo_width && systemConfig.logo_height) {
            setLogoDimensions({
              width: systemConfig.logo_width,
              height: systemConfig.logo_height
            });
          }
        }
      } else {
        // Configuração padrão se não existir
        setSystemName('CredCar Finance');
        setSystemDescription('Sistema de Gestão Financeira');
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      setError('Erro ao carregar configurações do sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Valida o arquivo
    const validation = systemConfigService.validateLogoFile(file);
    if (!validation.valid) {
      setError(validation.message || 'Arquivo inválido');
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);

      // Converte para base64
      const base64 = await systemConfigService.fileToBase64(file);
      
      // Cria uma imagem temporária para obter as dimensões
      const img = new Image();
      img.onload = () => {
        const dimensions = { width: img.width, height: img.height };
        
        // Valida as dimensões
        const dimensionValidation = systemConfigService.validateLogoDimensions(
          dimensions.width, 
          dimensions.height
        );
        
        if (!dimensionValidation.valid) {
          setError(dimensionValidation.message || 'Dimensões inválidas');
          setUploadingLogo(false);
          return;
        }

        setLogoPreview(base64);
        setLogoDimensions(dimensions);
        setUploadingLogo(false);
        setSuccess('Logo carregado com sucesso!');
        
        // Limpa o erro após 3 segundos
        setTimeout(() => setSuccess(null), 3000);
      };
      
      img.onerror = () => {
        setError('Erro ao processar a imagem');
        setUploadingLogo(false);
      };
      
      img.src = base64;
    } catch (error) {
      console.error('Erro ao processar logo:', error);
      setError('Erro ao processar o arquivo');
      setUploadingLogo(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setError(null);

      const updateData: SystemConfigUpdate = {
        system_name: systemName,
        system_description: systemDescription,
        logo_url: logoPreview || undefined,
        logo_width: logoDimensions?.width,
        logo_height: logoDimensions?.height
      };

      const success = await systemConfigService.updateSystemConfig(updateData);
      
      if (success) {
        setSuccess('Configurações salvas com sucesso!');
        
        // Atualiza o título da página
        systemConfigService.updatePageTitle(systemName);
        
        // Recarrega a configuração para obter os dados atualizados
        await loadSystemConfig();
        
        // Notifica o componente pai se necessário
        if (onConfigUpdate && config) {
          onConfigUpdate({ ...config, ...updateData } as SystemConfig);
        }
        
        // Limpa o sucesso após 3 segundos
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoDimensions(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Configure o nome do sistema, descrição e logo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alertas */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Nome do Sistema */}
          <div className="space-y-2">
            <Label htmlFor="systemName">Nome do Sistema</Label>
            <Input
              id="systemName"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Digite o nome do sistema"
              maxLength={100}
            />
            <p className="text-sm text-muted-foreground">
              Este nome será exibido no título da página e em todo o sistema
            </p>
          </div>

          {/* Descrição do Sistema */}
          <div className="space-y-2">
            <Label htmlFor="systemDescription">Descrição do Sistema</Label>
            <Textarea
              id="systemDescription"
              value={systemDescription}
              onChange={(e) => setSystemDescription(e.target.value)}
              placeholder="Digite a descrição do sistema"
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Descrição que aparecerá na meta tag da página
            </p>
          </div>

          {/* Upload do Logo */}
          <div className="space-y-4">
            <Label>Logo do Sistema</Label>
            
            {/* Preview do Logo */}
            {logoPreview && (
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="max-h-20 max-w-full object-contain"
                      style={{
                        maxWidth: logoDimensions ? `${logoDimensions.width}px` : '200px',
                        maxHeight: logoDimensions ? `${logoDimensions.height}px` : '60px'
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Logo atual</p>
                    {logoDimensions && (
                      <p className="text-xs text-muted-foreground">
                        {logoDimensions.width} x {logoDimensions.height}px
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remover Logo
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="space-y-2">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                {uploadingLogo ? (
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-muted-foreground">Processando logo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Clique para fazer upload do logo</p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG ou SVG • Máximo 2MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2"
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                  </div>
                )}
              </div>

              {/* Informações sobre dimensões */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Dimensões Recomendadas:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• <strong>200 x 60px</strong> → Padrão, nítido e leve</li>
                  <li>• <strong>250 x 80px</strong> → Mais qualidade em telas maiores</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2">
                  O logo será redimensionado automaticamente para não ultrapassar a linha do sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSaveConfig}
              disabled={saving || !systemName.trim()}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
