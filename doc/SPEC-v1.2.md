# CredCar Finance - Especificação Técnica v1.2

## 🎯 **Configurações do Sistema - Aba Geral**

### 📋 **Requisitos Funcionais**

#### **RF001 - Nome do Sistema**
- **Descrição**: Permitir alteração do nome do sistema
- **Entrada**: Campo de texto com máximo 50 caracteres
- **Saída**: 
  - Atualizar `<title>` da página
  - Atualizar meta description
  - Salvar no banco de dados
- **Validação**: Nome obrigatório, sem caracteres especiais

#### **RF002 - Descrição do Sistema**
- **Descrição**: Permitir alteração da descrição do sistema
- **Entrada**: Campo de texto com máximo 200 caracteres
- **Saída**: Atualizar meta description da página
- **Validação**: Descrição opcional

#### **RF003 - Upload de Logo**
- **Descrição**: Permitir upload e gerenciamento do logo do sistema
- **Entrada**: Arquivo de imagem (PNG, JPG, SVG)
- **Saída**: 
  - Logo exibido no header
  - Arquivo salvo no servidor
  - URL salva no banco de dados
- **Validação**: 
  - Tamanho máximo: 2MB
  - Formatos: PNG, JPG, SVG
  - Dimensões recomendadas: 200x60px ou 250x80px

### 🗄️ **Modelo de Dados**

#### **Tabela: system_settings**
```sql
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
```

#### **Configurações Padrão**
```sql
INSERT INTO system_settings (setting_key, setting_value, setting_type) VALUES
('system_name', 'CredCar Finance', 'string'),
('system_description', 'Sistema de Gestão Financeira para Representantes', 'string'),
('logo_url', NULL, 'string'),
('logo_width', '200', 'number'),
('logo_height', '60', 'number'),
('logo_alt_text', 'Logo do Sistema', 'string');
```

### 🎨 **Interface do Usuário**

#### **Componente: SettingsPage**
```typescript
interface SettingsPageProps {
  onSettingsChange?: (settings: SystemSettings) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'security'>('general');
  
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ Configurações do Sistema</h1>
      </div>
      
      <div className="settings-tabs">
        <button 
          className={activeTab === 'general' ? 'active' : ''}
          onClick={() => setActiveTab('general')}
        >
          Geral
        </button>
        <button 
          className={activeTab === 'appearance' ? 'active' : ''}
          onClick={() => setActiveTab('appearance')}
        >
          Aparência
        </button>
        <button 
          className={activeTab === 'security' ? 'active' : ''}
          onClick={() => setActiveTab('security')}
        >
          Segurança
        </button>
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

#### **Componente: GeneralSettings**
```typescript
const GeneralSettings: React.FC = () => {
  const { settings, updateSetting, loading } = useSettings();
  const [formData, setFormData] = useState({
    systemName: '',
    systemDescription: '',
    logoFile: null as File | null
  });
  
  const handleSave = async () => {
    try {
      // Salvar configurações
      await updateSetting('system_name', formData.systemName);
      await updateSetting('system_description', formData.systemDescription);
      
      // Upload do logo se houver
      if (formData.logoFile) {
        const logoUrl = await uploadLogo(formData.logoFile);
        await updateSetting('logo_url', logoUrl);
      }
      
      // Atualizar título da página
      document.title = formData.systemName;
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };
  
  return (
    <div className="general-settings">
      <div className="settings-section">
        <h3>🏢 Identidade do Sistema</h3>
        
        <div className="form-group">
          <label htmlFor="systemName">Nome do Sistema</label>
          <input
            id="systemName"
            type="text"
            value={formData.systemName}
            onChange={(e) => setFormData({...formData, systemName: e.target.value})}
            placeholder="CredCar Finance"
            maxLength={50}
          />
          <small>Máximo 50 caracteres</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="systemDescription">Descrição</label>
          <textarea
            id="systemDescription"
            value={formData.systemDescription}
            onChange={(e) => setFormData({...formData, systemDescription: e.target.value})}
            placeholder="Sistema de Gestão Financeira"
            maxLength={200}
            rows={3}
          />
          <small>Máximo 200 caracteres</small>
        </div>
      </div>
      
      <div className="settings-section">
        <h3>🖼️ Logo do Sistema</h3>
        
        <LogoUpload
          currentLogo={settings?.logoUrl}
          onLogoChange={(file) => setFormData({...formData, logoFile: file})}
        />
      </div>
      
      <div className="settings-actions">
        <button onClick={handleSave} disabled={loading}>
          💾 Salvar Configurações
        </button>
        <button onClick={resetToDefaults}>
          🔄 Restaurar Padrão
        </button>
      </div>
    </div>
  );
};
```

#### **Componente: LogoUpload**
```typescript
interface LogoUploadProps {
  currentLogo?: string;
  onLogoChange: (file: File | null) => void;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ currentLogo, onLogoChange }) => {
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar arquivo
      if (!validateImageFile(file)) {
        toast.error('Formato de arquivo inválido. Use PNG, JPG ou SVG.');
        return;
      }
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        onLogoChange(file);
      };
      reader.readAsDataURL(file);
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
    <div className="logo-upload">
      <div className="logo-preview">
        {preview ? (
          <img 
            src={preview} 
            alt="Logo Preview" 
            style={{ maxWidth: '200px', maxHeight: '60px' }}
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
        
        <button onClick={() => fileInputRef.current?.click()}>
          📁 Escolher Arquivo
        </button>
        
        {preview && (
          <button onClick={handleRemove} className="danger">
            🗑️ Remover
          </button>
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
  );
};
```

### 🔧 **Serviços**

#### **SettingsService**
```typescript
class SettingsService {
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

#### **ImageService**
```typescript
class ImageService {
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

### 🎯 **Hook useSettings**
```typescript
interface SystemSettings {
  systemName: string;
  systemDescription: string;
  logoUrl?: string;
  logoWidth: number;
  logoHeight: number;
}

const useSettings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const settingsService = new SettingsService();
  
  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };
  
  const updateSetting = async (key: string, value: any) => {
    try {
      await settingsService.updateSetting(key, value);
      
      // Atualizar estado local
      setSettings(prev => prev ? { ...prev, [key]: value } : null);
      
      // Se for nome do sistema, atualizar título da página
      if (key === 'system_name') {
        await settingsService.updatePageTitle(value);
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar configuração');
    }
  };
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  return {
    settings,
    loading,
    error,
    updateSetting,
    reloadSettings: loadSettings
  };
};
```

### 📱 **Responsividade**

#### **CSS para Logo Responsivo**
```css
.system-logo {
  max-width: 200px;
  max-height: 60px;
  object-fit: contain;
}

@media (min-width: 768px) {
  .system-logo {
    max-width: 250px;
    max-height: 80px;
  }
}

@media (max-width: 480px) {
  .system-logo {
    max-width: 150px;
    max-height: 45px;
  }
}
```

### 🔒 **Validações**

#### **Validação de Nome do Sistema**
- Obrigatório
- Máximo 50 caracteres
- Não pode conter caracteres especiais perigosos
- Trim de espaços em branco

#### **Validação de Descrição**
- Opcional
- Máximo 200 caracteres
- Permitir quebras de linha

#### **Validação de Logo**
- Formatos: PNG, JPG, SVG
- Tamanho máximo: 2MB
- Dimensões recomendadas respeitadas
- Validação de integridade do arquivo

### 🚀 **Implementação**

#### **Fase 1: Estrutura Base**
1. Criar tabela `system_settings`
2. Implementar `SettingsService`
3. Criar hook `useSettings`
4. Estrutura básica da página de configurações

#### **Fase 2: Interface**
1. Componente `SettingsPage`
2. Componente `GeneralSettings`
3. Componente `LogoUpload`
4. Estilos e responsividade

#### **Fase 3: Integração**
1. Upload de arquivos
2. Processamento de imagens
3. Atualização dinâmica do Page Title
4. Validações e tratamento de erros

#### **Fase 4: Testes**
1. Testes unitários
2. Testes de integração
3. Testes de responsividade
4. Validação de performance
