# 🤖 GitHub Actions Workflows

Este diretório contém os workflows automatizados do GitHub Actions para o projeto **Air Quality Checker**.

## 📋 Workflows Disponíveis

### 1. 🧪 **CI/CD Pipeline** (`ci.yml`)

**Trigger:** Push e Pull Requests para `main`

#### Jobs Executados:
- **🧪 Test & Build**
  - Testa em Node.js 18.x e 20.x
  - Instala dependências com `npm ci`
  - Executa auditoria de segurança
  - Roda lint (se configurado)
  - Executa testes unitários com cobertura
  - Faz build da aplicação (se necessário)
  - Valida estrutura HTML
  - Upload de artefatos de teste

- **📊 Code Quality** (apenas PRs)
  - Análise de qualidade de código
  - Estatísticas do projeto
  - Contagem de arquivos e linhas

- **🚀 Deploy Preview** (apenas PRs)
  - Simula deployment de preview
  - Comenta no PR com informações do deploy
  - Mostra status dos testes e link de preview

- **✅ Pipeline Status**
  - Reporta status final do pipeline
  - Consolida resultados de todos os jobs

### 2. 🚀 **Deploy to Production** (`deploy.yml`)

**Trigger:** Push para `main` (após merge)

#### Jobs Executados:
- **🏗️ Build for Production**
  - Build otimizado para produção
  - Testes finais antes do deployment
  - Otimização de assets estáticos
  - Preparo de artefatos de deployment

- **🌐 Deploy to GitHub Pages**
  - Deploy automático para GitHub Pages
  - Configuração de pages
  - Upload de artefatos

- **📢 Notify Deployment**
  - Notificação de status do deployment
  - Resumo das funcionalidades deployadas

- **📝 Create Release** (apenas para tags)
  - Geração automática de release notes
  - Criação de GitHub Release

## 🔧 Configuração Necessária

### Secrets do Repositório
Para funcionamento completo, configure os seguintes secrets:

```bash
# Opcional: para upload de cobertura
CODECOV_TOKEN=your_codecov_token
```

### Permissões Necessárias
Os workflows precisam das seguintes permissões:

```yaml
permissions:
  contents: read
  pull-requests: write  # Para comentários em PRs
  checks: write        # Para reportar status de checks
  pages: write         # Para GitHub Pages (deploy.yml)
  id-token: write      # Para GitHub Pages (deploy.yml)
```

### Configuração do GitHub Pages
1. Vá em **Settings** > **Pages**
2. Selecione **GitHub Actions** como source
3. O deployment será automático após push para `main`

## 🚦 Status dos Workflows

### CI Pipeline
- ✅ Testes unitários automatizados
- ✅ Testes em múltiplas versões do Node.js
- ✅ Análise de código em PRs
- ✅ Deploy preview simulado
- ✅ Comentários automáticos em PRs

### Deploy Pipeline  
- ✅ Build otimizado para produção
- ✅ Deploy automático para GitHub Pages
- ✅ Notificações de deployment
- ✅ Release notes automáticas (para tags)

## 📊 Estrutura dos Artefatos

### Artefatos de CI (`ci.yml`)
```
test-results-node-{version}/
├── coverage/           # Cobertura de testes
├── jest-results.xml    # Resultados do Jest
└── test-results/       # Outros resultados
```

### Artefatos de Produção (`deploy.yml`)
```
production-build/
├── dist/              # Build da aplicação
├── *.html             # Arquivos HTML
├── *.css              # Arquivos CSS
├── *.js               # Arquivos JavaScript
├── assets/            # Assets estáticos
└── images/            # Imagens
```

## 🎯 Funcionalidades dos Workflows

### Automação Completa
- **Testes Automáticos**: Toda mudança é testada
- **Deploy Automático**: Push para `main` = deploy automático
- **Preview de PRs**: Cada PR ganha um preview simulado
- **Análise de Qualidade**: Código é analisado em cada PR

### Segurança
- **Auditoria de Dependências**: `npm audit` em cada build
- **Testes em Múltiplas Versões**: Node.js 18.x e 20.x
- **Validação HTML**: Estrutura HTML é verificada
- **Artefatos Seguros**: Retention de 30-90 dias

### Comunicação
- **Comentários em PRs**: Status automático em Pull Requests
- **Notificações**: Status de deployment e build
- **Release Notes**: Geração automática para tags

## 🔄 Fluxo de Desenvolvimento

### Para Pull Requests:
1. **Push para branch** → Trigger do `ci.yml`
2. **Testes executados** em Node.js 18.x e 20.x
3. **Análise de código** executada
4. **Deploy preview** simulado
5. **Comentário automático** no PR com status

### Para Merge na Main:
1. **Merge na main** → Trigger do `deploy.yml`
2. **Build de produção** executado
3. **Deploy automático** para GitHub Pages
4. **Notificação** de deployment enviada

### Para Tags de Release:
1. **Push de tag** → Trigger do `deploy.yml`
2. **Build e deploy** normais
3. **Release notes** geradas automaticamente
4. **GitHub Release** criado

## 🛠️ Customização

### Modificando os Workflows

#### Para adicionar novos testes:
```yaml
- name: 🧪 Run custom tests
  run: npm run test:custom
```

#### Para adicionar novo ambiente de deploy:
```yaml
- name: 🌐 Deploy to staging
  run: |
    echo "Deploying to staging environment"
    # Comandos de deploy
```

#### Para modificar versões do Node.js:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]  # Adicionar 22.x
```

### Scripts NPM Esperados
Os workflows esperam os seguintes scripts no `package.json`:

```json
{
  "scripts": {
    "test": "jest",                    # Obrigatório
    "lint": "eslint .",               # Opcional
    "build": "webpack --mode=production", # Opcional
    "test:integration": "jest --testMatch='**/*.integration.test.js'" # Opcional
  }
}
```

## 🎉 Benefícios

### Para Desenvolvedores:
- **Feedback Rápido**: Testes automáticos em cada mudança
- **Deploy Sem Esforço**: Push para `main` = deploy automático
- **Qualidade Garantida**: Código sempre testado antes do merge

### Para o Projeto:
- **Confiabilidade**: Testes automáticos previnem regressões
- **Velocidade**: Deploy e testes rápidos
- **Documentação**: Workflows servem como documentação viva

### Para Usuários:
- **Uptime Alto**: Deploy automatizado reduz erro humano
- **Features Rápidas**: Pipeline eficiente = entregas mais rápidas
- **Qualidade**: Código sempre testado antes de chegar em produção

---

## 📞 Suporte

Se você encontrar problemas com os workflows:

1. **Verifique os logs** na aba Actions do GitHub
2. **Confirme as permissões** do repositório
3. **Valide os secrets** necessários
4. **Teste localmente** com `npm test` e `npm run build`

Os workflows estão configurados para serem resilientes e informativos, mas sempre verifique os logs em caso de falha!

🌬️ **Air Quality Checker** - Workflows configurados para máxima automação e confiabilidade!
