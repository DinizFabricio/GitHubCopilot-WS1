# 🌬️ Verificador da Qualidade do Ar

Uma aplicação web completa e responsiva que busca dados reais de qualidade do ar para diferentes cidades e estados ao redor do mundo, fornecendo informações detalhadas sobre IQA, poluentes e recomendações de saúde.

## 📋 Funcionalidades

### ✅ Funcionalidades Básicas (Prompt 1)
- **Formulário intuitivo** com validação do lado cliente
- **Campos obrigatórios**: Cidade e Estado/Província/Região
- **Campo opcional**: País (padrão: EUA)
- **Validação em tempo real** com feedback visual
- **Interface responsiva** e moderna

### 🌐 Funcionalidades de API (Prompt 2)
- **🗺️ Geocodificação**: Converte localização em coordenadas usando API Nominatim (OpenStreetMap)
- **🌬️ Dados de qualidade do ar**: Busca IQA atual via API Open-Meteo
- **📊 Informações detalhadas**: IQA, poluentes individuais, poluente dominante
- **💡 Recomendações de saúde**: Baseadas no nível de qualidade do ar
- **⚠️ Tratamento robusto de erros**: APIs indisponíveis, localizações inexistentes
- **🔄 Indicador de loading**: Feedback visual durante busca de dados

## 🚀 Como Usar

1. **Abra o arquivo `index.html`** em qualquer navegador moderno
2. **Preencha os campos:**
   - **Cidade**: Ex: "São Paulo", "New York", "Londres"
   - **Estado/Região**: Ex: "SP", "NY", "Inglaterra"  
   - **País** (opcional): Ex: "Brasil", "EUA", "Reino Unido"
3. **Clique em "Verificar Qualidade do Ar"**
4. **Aguarde os dados** serem buscados das APIs públicas
5. **Visualize os resultados** completos com recomendações

## 🤖 CI/CD e Automação

### 🚀 Workflows Automatizados
O projeto inclui **pipelines completos do GitHub Actions**:

#### 🧪 **CI Pipeline** (`ci.yml`)
- **Trigger**: Push e Pull Requests para `main`
- **Testes**: Node.js 18.x e 20.x
- **Auditoria**: Verificação de segurança de dependências
- **Lint**: Análise estática de código (se configurado)
- **Cobertura**: Upload automático para Codecov
- **Preview**: Deploy simulado para Pull Requests

#### 🚀 **Deploy Pipeline** (`deploy.yml`)  
- **Trigger**: Push para `main` (após merge)
- **Build**: Otimização para produção
- **Deploy**: Automático para GitHub Pages
- **Release**: Geração automática de release notes

### 📊 Status dos Workflows
[![CI](https://github.com/DinizFabricio/GitHubCopilot-WS1/workflows/CI/badge.svg)](https://github.com/DinizFabricio/GitHubCopilot-WS1/actions)
[![Deploy](https://github.com/DinizFabricio/GitHubCopilot-WS1/workflows/Deploy/badge.svg)](https://github.com/DinizFabricio/GitHubCopilot-WS1/actions)

### 🎯 Funcionalidades do CI/CD
- **✅ Testes Automáticos**: Todo código é testado antes do merge
- **🚀 Deploy Contínuo**: Push para `main` = deploy automático  
- **🔍 Code Review**: Análise automática de qualidade em PRs
- **📊 Cobertura**: Tracking automático de cobertura de testes
- **🔒 Segurança**: Auditoria automática de dependências
- **📢 Notificações**: Comentários automáticos em PRs com status

## 📁 Estrutura do Projeto

```
├── 📄 index.html               # Página principal da aplicação
├── 🎨 styles.css               # Estilos CSS organizados
├── ⚡ script.js                # Lógica JavaScript (ES6 Classes)
├── 📦 package.json             # Configuração do projeto Node.js
├── 🧪 jest.config.js           # Configuração para testes
├── 🔧 jest.setup.js            # Setup para testes
├── 📋 README.md                # Documentação principal
├── 📝 CHECKLIST.md             # Checklist de funcionalidades
├── 🧪 TESTE-SUMMARY.md         # Resumo dos testes implementados
├── 🏷️ testes.html              # Página para testes manuais
├── 📂 __tests__/               # Pasta com testes automatizados
│   └── air-quality.test.js     # Suite completa de testes (45+ casos)
└── 🤖 .github/                 # Configurações do GitHub
    ├── 📖 README.md            # Documentação dos workflows
    ├── 📋 github-instructions.md # Instruções específicas
    └── workflows/              # Pipelines automatizados
        ├── ci.yml              # Pipeline de CI/CD
        └── deploy.yml          # Pipeline de deploy
```

## 🌐 APIs Integradas

### Nominatim (OpenStreetMap)
- **URL**: `https://nominatim.openstreetmap.org/`
- **Função**: Geocodificação (conversão de endereços em coordenadas)
- **Sem autenticação**: API pública e gratuita
- **Headers**: User-Agent personalizado e Accept-Language para PT-BR

### Open-Meteo Air Quality API
- **URL**: `https://air-quality-api.open-meteo.com/v1/air-quality`
- **Função**: Dados de qualidade do ar em tempo real
- **Parâmetros**: IQA americano, PM2.5, PM10, CO, NO₂, SO₂, O₃, poluente dominante
- **Sem autenticação**: API pública e gratuita

## 📊 Dados Exibidos

### Índice de Qualidade do Ar (IQA)
- **🟢 0-50**: Boa qualidade do ar
- **🟡 51-100**: Qualidade moderada  
- **🟠 101-150**: Insalubre para grupos sensíveis
- **🔴 151-200**: Insalubre
- **🟣 201-300**: Muito insalubre
- **🟤 301+**: Perigoso

### Poluentes Monitorados
- **PM2.5**: Partículas finas (≤ 2.5 μm)
- **PM10**: Partículas inaláveis (≤ 10 μm)
- **CO**: Monóxido de Carbono
- **NO₂**: Dióxido de Nitrogênio
- **SO₂**: Dióxido de Enxofre
- **O₃**: Ozônio troposférico

### Recomendações de Saúde
- **Atividades ao ar livre** recomendadas ou restritas
- **Grupos sensíveis** (crianças, idosos, pessoas com problemas respiratórios)
- **Uso de máscaras** quando necessário
- **Ventilação** de ambientes internos

## ✨ Características Técnicas

### Validação do Lado Cliente
- Verificação de campos obrigatórios
- Validação de comprimento mínimo (2 caracteres)
- Validação de caracteres permitidos (letras, espaços, pontos, hífens)
- Feedback visual em tempo real

### Interface do Usuário
- Design responsivo para desktop e mobile
- Gradiente moderno e atraente
- Animações suaves
- Estados de hover e focus bem definidos
- Feedback de loading durante processamento

### Acessibilidade
- Labels adequadamente associados aos inputs
- Navegação por teclado
- Contraste adequado de cores
- Suporte a `prefers-reduced-motion`

## 🧪 Executar Testes

```bash
# Instalar dependências
npm install

# Executar testes
npm test
```

## 🌐 Compatibilidade

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Dispositivos móveis (iOS Safari, Android Chrome)

## 📱 Responsividade

A aplicação é totalmente responsiva e se adapta a:
- **Desktop** (1024px+)
- **Tablet** (768px - 1023px)
- **Mobile** (320px - 767px)

## 🎯 Próximos Passos

Esta é uma aplicação básica seguindo o primeiro prompt do workshop. Para expandir, considere:

1. **Integração com APIs reais** de qualidade do ar
2. **Armazenamento de histórico** de pesquisas
3. **Geolocalização automática** do usuário
4. **Notificações push** para alertas de qualidade do ar
5. **Gráficos e visualizações** dos dados

## 👨‍💻 Desenvolvimento

Para contribuir com o projeto:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Crie um Pull Request

---

**GitHub Copilot Workshop 1** - Desenvolvido como parte do treinamento 🚀
