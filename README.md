# Extrator PSD - Editor de Design com IA

Aplicação Next.js para processamento de arquivos PSD com funcionalidades de IA para geração de paletas de cores e variações de design.

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Preencha as API keys necessárias no arquivo `.env`:
- **OPENAI_API_KEY**: Para geração de paletas de cores e textos
- **GOOGLE_API_KEY**: Para geração de imagens com Gemini 2.5 Flash
- **FAL_API_KEY**: Para geração alternativa de imagens
- **REPLICATE_API_TOKEN**: Para geração com SDXL
- **NEXT_PUBLIC_LICENSE**: Licença do CE.SDK

### 3. Executar o Projeto
```bash
npm run dev
```

Acesse: `http://localhost:3000`

## 🛠 Funcionalidades

- ✅ Upload e processamento de arquivos PSD
- ✅ Extração automática de elementos (imagens, formas, textos)
- ✅ Geração de paletas de cores com IA
- ✅ Aplicação inteligente de cores preservando gradientes/logos
- ✅ Geração de variações de design com Gemini 2.5 Flash
- ✅ Preview em tempo real das alterações
- ✅ Upload e substituição de imagens

## 🔑 API Keys Necessárias

| Serviço | Para que serve | Onde obter |
|---------|----------------|------------|
| OpenAI | Paletas de cores, textos | https://platform.openai.com/api-keys |
| Google AI | Geração de imagens | https://ai.google.dev/ |
| fal.ai | Geração alternativa | https://fal.ai/ |
| Replicate | SDXL para imagens | https://replicate.com/ |
| CE.SDK | Editor de design | https://img.ly/ |

## 📁 Estrutura Principal

```
src/
├── app/api/          # API routes (Next.js)
├── components/case/  # Componentes principais
└── lib/             # Utilitários
```

## 🐛 Solução de Problemas

- **Erro de API key**: Verifique se todas as chaves estão configuradas no `.env`
- **Erro de CORS**: Certifique-se que está rodando em `localhost:3000`
- **Erro de dependências**: Execute `npm install --legacy-peer-deps` se necessário
