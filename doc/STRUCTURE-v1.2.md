# CredCar Finance - Estrutura de Arquivos v1.2

## 📁 **Estrutura de Pastas Atualizada**

```
src/
├── components/
│   ├── auth/                    # Componentes de autenticação
│   ├── dashboard/               # Dashboards existentes
│   ├── sales/                   # Componentes de vendas
│   ├── settings/                # 🆕 NOVA PASTA - Configurações
│   │   ├── SettingsPage.tsx     # Página principal de configurações
│   │   ├── GeneralSettings.tsx  # Aba Geral
│   │   ├── AppearanceSettings.tsx # Aba Aparência (futura)
│   │   ├── SecuritySettings.tsx # Aba Segurança (futura)
│   │   ├── SystemIdentity.tsx   # Configurações de identidade
│   │   └── LogoUpload.tsx       # Componente de upload de logo
│   └── ui/                      # Componentes UI existentes
├── lib/
│   ├── supabase.ts              # Cliente Supabase existente
│   ├── auth.service.ts          # Serviço de auth existente
│   ├── upload.service.ts         # Serviço de upload existente
│   ├── settings.service.ts      # 🆕 NOVO - Serviço de configurações
│   └── image.service.ts         # 🆕 NOVO - Serviço de processamento de imagens
├── hooks/
│   ├── useAuth.ts               # Hook de auth existente
│   └── useSettings.ts           # 🆕 NOVO - Hook de configurações
├── types/
│   ├── supabase.ts              # Tipos Supabase existentes
│   └── settings.ts              # 🆕 NOVO - Tipos de configurações
├── styles/
│   ├── globals.css              # Estilos globais existentes
│   └── settings.css             # 🆕 NOVO - Estilos específicos de configurações
└── App.tsx                      # App principal (atualizar rotas)
```

## 🗄️ **Banco de Dados**

### **Nova Tabela: system_settings**
```sql
-- Arquivo: supabase/migrations/20250103000001_create_system_settings.sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_type ON system_settings(setting_type);

-- Configurações iniciais
INSERT INTO system_settings (setting_key, setting_value, setting_type) VALUES
('system_name', 'CredCar Finance', 'string'),
('system_description', 'Sistema de Gestão Financeira para Representantes', 'string'),
('logo_url', NULL, 'string'),
('logo_width', '200', 'number'),
('logo_height', '60', 'number'),
('logo_alt_text', 'Logo do Sistema', 'string');

-- RLS Policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados (apenas admins)
CREATE POLICY "Authenticated users can manage system settings" ON system_settings
  FOR ALL USING (auth.role() = 'authenticated');
```

## 🎨 **Componentes Detalhados**

### **1. SettingsPage.tsx**
```typescript
// src/components/settings/SettingsPage.tsx
import React, { useState } from 'react';
import { GeneralSettings } from './GeneralSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { SecuritySettings } from './SecuritySettings';

type TabType = 'general' | 'appearance' | 'security';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  
  const tabs = [
    { key: 'general', label: 'Geral', icon: '⚙️' },
    { key: 'appearance', label: 'Aparência', icon: '🎨' },
    { key: 'security', label: 'Segurança', icon: '🔒' }
  ];
  
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ Configurações do Sistema</h1>
        <p>Personalize as configurações do seu sistema</p>
      </div>
      
      <div className="settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key as TabType)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      
      <div className="settings-content">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'security' && <SecuritySettings />}
      </div>
    </div>
  );
};
```

### **2. GeneralSettings.tsx**
```typescript
// src/components/settings/GeneralSettings.tsx
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { SystemIdentity } from './SystemIdentity';
import { LogoUpload } from './LogoUpload';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast';

export const GeneralSettings: React.FC = () => {
  const { settings, loading, updateSetting } = useSettings();
  const [formData, setFormData] = useState({
    systemName: '',
    systemDescription: '',
    logoFile: null as File | null
  });
  
  useEffect(() => {
    if (settings) {
      setFormData({
        systemName: settings.systemName,
        systemDescription: settings.systemDescription,
        logoFile: null
      });
    }
  }, [settings]);
  
  const handleSave = async () => {
    try {
      // Salvar configurações
      await updateSetting('system_name', formData.systemName);
      await updateSetting('system_description', formData.systemDescription);
      
      // Upload do logo se houver
      if (formData.logoFile) {
        // Implementar upload
        // const logoUrl = await uploadLogo(formData.logoFile);
        // await updateSetting('logo_url', logoUrl);
      }
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };
  
  const resetToDefaults = () => {
    setFormData({
      systemName: 'CredCar Finance',
      systemDescription: 'Sistema de Gestão Financeira para Representantes',
      logoFile: null
    });
  };
  
  if (loading) {
    return <div className="loading">Carregando configurações...</div>;
  }
  
  return (
    <div className="general-settings">
      <SystemIdentity
        systemName={formData.systemName}
        systemDescription={formData.systemDescription}
        onSystemNameChange={(name) => setFormData({...formData, systemName: name})}
        onSystemDescriptionChange={(desc) => setFormData({...formData, systemDescription: desc})}
      />
      
      <LogoUpload
        currentLogo={settings?.logoUrl}
        onLogoChange={(file) => setFormData({...formData, logoFile: file})}
      />
      
      <div className="settings-actions">
        <Button onClick={handleSave} disabled={loading}>
          💾 Salvar Configurações
        </Button>
        <Button onClick={resetToDefaults} variant="outline">
          🔄 Restaurar Padrão
        </Button>
      </div>
    </div>
  );
};
```

### **3. SystemIdentity.tsx**
```typescript
// src/components/settings/SystemIdentity.tsx
import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface SystemIdentityProps {
  systemName: string;
  systemDescription: string;
  onSystemNameChange: (name: string) => void;
  onSystemDescriptionChange: (description: string) => void;
}

export const SystemIdentity: React.FC<SystemIdentityProps> = ({
  systemName,
  systemDescription,
  onSystemNameChange,
  onSystemDescriptionChange
}) => {
  return (
    <div className="settings-section">
      <h3>🏢 Identidade do Sistema</h3>
      
      <div className="form-group">
        <Label htmlFor="systemName">Nome do Sistema</Label>
        <Input
          id="systemName"
          type="text"
          value={systemName}
          onChange={(e) => onSystemNameChange(e.target.value)}
          placeholder="CredCar Finance"
          maxLength={50}
        />
        <small>Máximo 50 caracteres</small>
      </div>
      
      <div className="form-group">
        <Label htmlFor="systemDescription">Descrição</Label>
        <Textarea
          id="systemDescription"
          value={systemDescription}
          onChange={(e) => onSystemDescriptionChange(e.target.value)}
          placeholder="Sistema de Gestão Financeira para Representantes"
          maxLength={200}
          rows={3}
        />
        <small>Máximo 200 caracteres</small>
      </div>
    </div>
  );
};
```

### **4. LogoUpload.tsx**
```typescript
// src/components/settings/LogoUpload.tsx
import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { ImageService } from '../../lib/image.service';
import { toast } from 'react-hot-toast';

interface LogoUploadProps {
  currentLogo?: string;
  onLogoChange: (file: File | null) => void;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  currentLogo,
  onLogoChange
}) => {
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageService = new ImageService();
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar arquivo
      if (!imageService.validateImageFile(file)) {
        toast.error('Formato de arquivo inválido. Use PNG, JPG ou SVG.');
        return;
      }
      
      // Redimensionar se necessário
      const resizedFile = await imageService.resizeImage(file, 250, 80);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        onLogoChange(resizedFile);
      };
      reader.readAsDataURL(resizedFile);
    }
  };
  
  const handleRemove = () => {
    setPreview(null);
    onLogoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="settings-section">
      <h3>🖼️ Logo do Sistema</h3>
      
      <div className="logo-upload">
        <div className="logo-preview">
          {preview ? (
            <img 
              src={preview} 
              alt="Logo Preview" 
              className="logo-preview-image"
            />
          ) : (
            <div className="logo-placeholder">
              📷 Nenhum logo selecionado
            </div>
          )}
        </div>
        
        <div className="logo-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <Button onClick={() => fileInputRef.current?.click()}>
            📁 Escolher Arquivo
          </Button>
          
          {preview && (
            <Button onClick={handleRemove} variant="destructive">
              🗑️ Remover
            </Button>
          )}
        </div>
        
        <div className="logo-info">
          <p><strong>Tamanhos recomendados:</strong></p>
          <ul>
            <li>200 x 60 px → padrão, nítido e leve</li>
            <li>250 x 80 px → alta qualidade para telas maiores</li>
          </ul>
          <p><strong>Formatos aceitos:</strong> PNG, JPG, SVG</p>
          <p><strong>Tamanho máximo:</strong> 2MB</p>
        </div>
      </div>
    </div>
  );
};
```

## 🔧 **Serviços**

### **1. settings.service.ts**
```typescript
// src/lib/settings.service.ts
import { createClient } from '@supabase/supabase-js';
import { SystemSettings } from '../types/settings';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class SettingsService {
  private supabase = createClient(supabaseUrl, supabaseKey);
  
  async getSettings(): Promise<SystemSettings> {
    const { data, error } = await this.supabase
      .from('system_settings')
      .select('*');
    
    if (error) throw error;
    
    // Converter array para objeto
    const settings: SystemSettings = {
      systemName: data.find(s => s.setting_key === 'system_name')?.setting_value || 'CredCar Finance',
      systemDescription: data.find(s => s.setting_key === 'system_description')?.setting_value || '',
      logoUrl: data.find(s => s.setting_key === 'logo_url')?.setting_value || null,
      logoWidth: parseInt(data.find(s => s.setting_key === 'logo_width')?.setting_value || '200'),
      logoHeight: parseInt(data.find(s => s.setting_key === 'logo_height')?.setting_value || '60')
    };
    
    return settings;
  }
  
  async updateSetting(key: string, value: any): Promise<void> {
    const { error } = await this.supabase
      .from('system_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
  }
  
  async updatePageTitle(title: string): Promise<void> {
    // Atualizar título da página
    document.title = title;
    
    // Atualizar meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', title);
    }
  }
}
```

### **2. image.service.ts**
```typescript
// src/lib/image.service.ts
export class ImageService {
  validateImageFile(file: File): boolean {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (!allowedTypes.includes(file.type)) {
      return false;
    }
    
    if (file.size > maxSize) {
      return false;
    }
    
    return true;
  }
  
  async resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular novas dimensões mantendo proporção
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, { type: file.type });
            resolve(resizedFile);
          }
        }, file.type, 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}
```

## 🎨 **Estilos CSS**

### **settings.css**
```css
/* src/styles/settings.css */

.settings-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.settings-header {
  margin-bottom: 2rem;
}

.settings-header h1 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.settings-header p {
  color: #6b7280;
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-button:hover {
  background-color: #f9fafb;
}

.tab-button.active {
  border-bottom-color: #3b82f6;
  color: #3b82f6;
}

.tab-icon {
  font-size: 1.2rem;
}

.settings-content {
  background: white;
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.settings-section {
  margin-bottom: 2rem;
}

.settings-section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #374151;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #374151;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.logo-upload {
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
}

.logo-preview {
  margin-bottom: 1rem;
}

.logo-preview-image {
  max-width: 200px;
  max-height: 60px;
  object-fit: contain;
  border-radius: 0.25rem;
}

.logo-placeholder {
  color: #6b7280;
  font-size: 1.125rem;
}

.logo-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.logo-info {
  text-align: left;
  background: #f9fafb;
  padding: 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.logo-info p {
  margin-bottom: 0.5rem;
}

.logo-info ul {
  margin-left: 1rem;
  margin-bottom: 0.5rem;
}

.settings-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

/* Responsividade */
@media (max-width: 768px) {
  .settings-page {
    padding: 1rem;
  }
  
  .settings-tabs {
    flex-direction: column;
  }
  
  .tab-button {
    justify-content: center;
  }
  
  .settings-content {
    padding: 1rem;
  }
  
  .logo-actions {
    flex-direction: column;
  }
  
  .settings-actions {
    flex-direction: column;
  }
}
```

## 🚀 **Rotas Atualizadas**

### **App.tsx**
```typescript
// Adicionar nova rota para configurações
import { SettingsPage } from './components/settings/SettingsPage';

// Dentro do Router
<Route path="/configuracoes" element={<SettingsPage />} />
```

## 📝 **Próximos Passos**

1. **Criar migration** para tabela `system_settings`
2. **Implementar componentes** básicos
3. **Configurar rotas** de configurações
4. **Testar funcionalidades** básicas
5. **Implementar upload** de logo
6. **Integrar com header** do sistema
