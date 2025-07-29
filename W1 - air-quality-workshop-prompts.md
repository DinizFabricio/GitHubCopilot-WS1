# Aplicação Web de Verificação da Qualidade do Ar: Prompts do Copilot Agent

Abaixo estão conjuntos de prompts de exemplo para orientar um desenvolvedor passo a passo na criação de uma aplicação web **Verificador da Qualidade do Ar** usando o Copilot no modo agente. Os prompts são projetados para dar suporte às principais linguagens e frameworks (ex.: JavaScript/React, Python/Flask, etc.) e são estruturados para melhoria progressiva.

---

## 1. Prompt de Estrutura Básica da Aplicação Web

**Objetivo:**  
Criar uma aplicação web que permita ao usuário inserir cidade, estado/província/região e país (ou cidade e estado para BRASIL por padrão).  

**Prompt:**
```
Crie uma aplicação web mínima que permita ao usuário inserir:
- uma cidade, estado/província/região e país
- ou apenas uma cidade e estado (assumindo EUA como país padrão).

Mostre um formulário simples com os campos de entrada necessários e um botão de envio. A aplicação deve ter validação básica do lado cliente para garantir que todos os campos obrigatórios sejam preenchidos. Use qualquer framework frontend popular ou HTML/JS simples e configure a estrutura básica do projeto.
```

---

## 2. Adicionar Busca e Exibição de Dados de IQA

**Objetivo:**  
Aprimorar a aplicação para buscar dados de qualidade do ar de uma API pública e exibir o IQA e informações relevantes.

**Prompt:**
```
Atualize a aplicação web para buscar o índice de qualidade do ar (IQA) atual e outras informações relevantes sobre qualidade do ar para a localização que o usuário inserir.

- Use a API de Qualidade do Ar Open-Meteo (https://open-meteo.com/en/docs/air-quality-api), que não requer autenticação ou token de API.
- Quando o formulário for enviado, converta a entrada de localização do usuário em coordenadas geográficas (latitude e longitude) usando uma API de geocodificação pública (como Nominatim: https://nominatim.openstreetmap.org/).
- Busque o IQA e exiba-o na página, junto com detalhes principais como o poluente principal, horário da medição e quaisquer avisos de saúde se disponíveis.
- Trate erros de forma elegante (ex.: localização não encontrada, problemas de API).
- Organize o código para manutenibilidade.
```

---

## 3. Opcional: Adicionar Testes Unitários/Integração

**Objetivo:**  
Adicionar testes ao projeto.

**Prompt:**
```
Adicione um conjunto de testes para a aplicação web.

- Inclua testes unitários e de integração.
- Teste a validação do formulário, a lógica de busca da API e a renderização dos resultados do IQA.
```
---


## 4. Opcional: Adicionar Automação de Build e Teste com GitHub Actions

**Objetivo:**  
Configurar CI para automatizar testes e builds.

**Prompt:**
```
Adicione um workflow do GitHub Actions ao projeto.

- O workflow deve ser executado automaticamente em pull requests e pushes para a branch principal.
- Deve instalar dependências, fazer build da aplicação (se necessário) e executar todos os testes.
- Use um template apropriado para a linguagem e framework escolhidos.
- Coloque o YAML do workflow no diretório .github/workflows.
```

---

## 5. Sugestões de Extensão Adicional do Workshop

Aqui estão maneiras adicionais de estender a aplicação Verificador da Qualidade do Ar, adequadas para participantes do workshop que terminarem mais cedo ou quiserem explorar recursos mais avançados:

### a. **Armazenar e Visualizar Histórico de Buscas**
- Permitir que usuários salvem cada busca em um banco de dados open source (como SQLite ou PostgreSQL).
- Exibir uma tabela ou gráfico mostrando tendências de IQA para as cidades pesquisadas anteriormente.

### b. **Localizações Favoritas**
- Permitir que usuários marquem localizações como favoritas e rapidamente verifiquem o IQA novamente.
- Armazenar favoritos no banco de dados e exibi-los em um painel.

### c. **Comparar Múltiplas Cidades**
- Permitir que usuários insiram e comparem dados de IQA para duas ou mais cidades lado a lado.
- Visualizar diferenças usando gráficos ou cartões codificados por cores.

### d. **Integração com Mapa**
- Mostrar localizações pesquisadas ou favoritas em um mapa (ex.: usando Leaflet.js ou Google Maps API).
- Exibir IQA como pinos coloridos ou mapas de calor.

### e. **Responsividade Mobile e Acessibilidade**
- Melhorar a interface de usuário para dispositivos móveis.
- Adicionar recursos de acessibilidade como navegação por teclado e labels ARIA.

### f. **Recomendações de Saúde**
- Exibir orientações de saúde contextuais baseadas nos níveis de IQA (ex.: "Prejudicial para Grupos Sensíveis").
- Opcionalmente, linkar para recomendações do governo local ou da OMS.

### g. **Localização e Internacionalização**
- Dar suporte a múltiplas linguagens para a interface da aplicação.
- Permitir que usuários escolham sua linguagem e unidades preferidas (ex.: µg/m³ vs. ppm).

### h. **Suporte Offline**
- Permitir que usuários vejam resultados recentes de IQA offline usando service workers ou armazenamento local.

### i. **Contas de Usuário (Avançado)**
- Adicionar login opcional de usuário para que pessoas possam salvar seu histórico e favoritos entre dispositivos (usando uma solução de autenticação open source).

---

### Como Usar Estes Prompts

1. **Comece com o primeiro prompt** para estruturar sua aplicação web.
2. **Use o segundo prompt** para adicionar funcionalidade central de IQA.
3. **Opcionalmente, use o terceiro e quarto prompts** para adicionar testes e CI.
4. **Explore extensões adicionais** conforme o tempo permitir ou para sessões de workshop mais avançadas.

Estes prompts são intencionalmente abertos para que o Copilot possa adaptar sua saída à sua stack tecnológica escolhida. Você pode especificar ainda mais a linguagem ou framework em seu prompt para resultados mais focados (ex.: "usando Python e Flask", "com React", etc.).

Me avise se você quiser exemplos de saída para uma stack específica!