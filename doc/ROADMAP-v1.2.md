# CredCar Finance - Roadmap de Atualizações

## 📋 **Próximas Funcionalidades**

### 🎯 **v1.2 - Configurações do Sistema**

#### **📝 Descrição**
Implementar uma área de configurações completa para personalização do sistema, começando pela aba "Geral" com configurações básicas de identidade.

#### **🔧 Funcionalidades Planejadas**

##### **1. Menu Configurações > Aba Geral**

###### **🏢 Identidade do Sistema**
- **Nome do Sistema**
  - Campo de texto para inserir nome personalizado
  - Alterar automaticamente o `Page Title` do sistema
  - Alterar a descrição/meta description da página
  - Salvar configuração no banco de dados

###### **🖼️ Logo do Sistema**
- **Upload de Logo**
  - Permitir upload de arquivo de imagem
  - Validação de formato (PNG, JPG, SVG)
  - Redimensionamento automático para manter proporções
  
- **Tamanhos Recomendados**
  - **Padrão**: `200 x 60 px` - nítido e leve
  - **Alta qualidade**: `250 x 80 px` - para telas maiores
  - **Responsivo**: Adaptar para diferentes resoluções

- **Restrições de Layout**
  - Logo não pode ultrapassar a linha do sistema
  - Altura máxima definida para manter consistência visual
  - Posicionamento fixo no header

#### **🗂️ Estrutura de Arquivos**

```
src/
├── components/
│   └── settings/
│       ├── SettingsPage.tsx          # Página principal de configurações
│       ├── GeneralSettings.tsx       # Aba Geral
│       ├── SystemIdentity.tsx        # Configurações de identidade
│       └── LogoUpload.tsx            # Componente de upload de logo
├── lib/
│   ├── settings.service.ts           # Serviço para gerenciar configurações
│   └── image.service.ts              # Serviço para processamento de imagens
├── types/
│   └── settings.ts                   # Tipos TypeScript para configurações
└── hooks/
    └── useSettings.ts                # Hook para gerenciar estado das configurações
```

#### **🗄️ Banco de Dados**

##### **Tabela: `system_settings`**
```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações iniciais
INSERT INTO system_settings (setting_key, setting_value, setting_type) VALUES
('system_name', 'CredCar Finance', 'string'),
('system_description', 'Sistema de Gestão Financeira', 'string'),
('logo_url', NULL, 'string'),
('logo_width', '200', 'number'),
('logo_height', '60', 'number');
```

#### **🎨 Interface**

##### **Layout da Página de Configurações**
```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ Configurações do Sistema                            │
├─────────────────────────────────────────────────────────┤
│  [Geral] [Aparência] [Segurança] [Integrações]          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🏢 Identidade do Sistema                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Nome do Sistema: [CredCar Finance        ]     │   │
│  │ Descrição: [Sistema de Gestão...        ]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🖼️ Logo do Sistema                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Logo Atual]  [📁 Escolher Arquivo] [Remover]  │   │
│  │ Tamanho recomendado: 200x60px ou 250x80px      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [💾 Salvar Configurações] [🔄 Restaurar Padrão]       │
└─────────────────────────────────────────────────────────┘
```

#### **⚙️ Implementação Técnica**

##### **1. Hook useSettings**
```typescript
interface SystemSettings {
  systemName: string;
  systemDescription: string;
  logoUrl?: string;
  logoWidth: number;
  logoHeight: number;
}

const useSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>();
  const [loading, setLoading] = useState(true);
  
  const updateSetting = async (key: string, value: any) => {
    // Implementar atualização
  };
  
  return { settings, loading, updateSetting };
};
```

##### **2. Serviço de Configurações**
```typescript
class SettingsService {
  async getSettings(): Promise<SystemSettings> {
    // Buscar configurações do banco
  }
  
  async updateSetting(key: string, value: any): Promise<void> {
    // Atualizar configuração específica
  }
  
  async updatePageTitle(title: string): Promise<void> {
    // Atualizar título da página dinamicamente
  }
}
```

##### **3. Processamento de Imagem**
```typescript
class ImageService {
  async resizeLogo(file: File, maxWidth: number, maxHeight: number): Promise<File> {
    // Redimensionar logo mantendo proporções
  }
  
  async validateImageFormat(file: File): Promise<boolean> {
    // Validar formato (PNG, JPG, SVG)
  }
}
```

#### **📱 Responsividade**

- **Desktop**: Logo 250x80px
- **Tablet**: Logo 200x60px  
- **Mobile**: Logo 150x45px (proporcional)

#### **🔒 Validações**

- **Nome do Sistema**: Máximo 50 caracteres
- **Descrição**: Máximo 200 caracteres
- **Logo**: Máximo 2MB, formatos PNG/JPG/SVG
- **Dimensões**: Respeitar proporções recomendadas

#### **💾 Persistência**

- Configurações salvas em `system_settings`
- Cache local para performance
- Backup automático das configurações
- Histórico de alterações

---

## 📅 **Cronograma**

- **Semana 1**: Estrutura base e banco de dados
- **Semana 2**: Interface e upload de logo
- **Semana 3**: Integração com Page Title
- **Semana 4**: Testes e refinamentos

---

## 🎯 **Objetivos**

1. ✅ Permitir personalização completa da identidade visual
2. ✅ Manter consistência visual em todas as telas
3. ✅ Interface intuitiva e responsiva
4. ✅ Performance otimizada
5. ✅ Validações robustas
