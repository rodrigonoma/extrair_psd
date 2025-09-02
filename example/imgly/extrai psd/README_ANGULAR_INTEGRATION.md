# 🎨 PSD Font Extractor - Angular + Python

Aplicação completa com **frontend Angular** e **backend Python** para extração de fontes de arquivos PSD.

## 🏗️ **Arquitetura**

```
Frontend Angular ←→ REST API ←→ Python Script
     (Upload)        (HTTP)      (Binary Analysis)
```

## 🚀 **Setup - Backend Python**

### 1. **Instalar Dependências:**
```bash
cd "C:\extrai psd"
pip install -r api_requirements.txt
```

### 2. **Executar API:**
```bash
python psd_api.py
```

**API rodando em:** `http://localhost:5000`

### 3. **Endpoints Disponíveis:**
- `GET /api/health` - Health check
- `POST /api/analyze-psd` - Upload e análise de PSD
- `GET /api/supported-formats` - Formatos suportados

## 🅰️ **Setup - Frontend Angular**

### 1. **Pré-requisitos:**
```bash
node --version  # >= 16.x
npm --version   # >= 8.x
```

### 2. **Criar Projeto Angular:**
```bash
cd "C:\extrai psd"
ng new angular-app --routing --style=scss
cd angular-app
```

### 3. **Copiar Arquivos:**
- Copie todos os arquivos da pasta `angular-app/` criada
- Sobrescreva os arquivos existentes

### 4. **Instalar e Executar:**
```bash
npm install
ng serve
```

**App rodando em:** `http://localhost:4200`

## 📱 **Como Usar**

### **1. Iniciar Backend:**
```bash
# Terminal 1
cd "C:\extrai psd"
python psd_api.py
```

### **2. Iniciar Frontend:**
```bash
# Terminal 2  
cd "C:\extrai psd\angular-app"
ng serve
```

### **3. Acessar Aplicação:**
- Abra: `http://localhost:4200`
- Faça upload de um arquivo PSD
- Visualize as fontes extraídas

## 🔧 **API Endpoints**

### **POST /api/analyze-psd**
Upload de arquivo PSD para análise.

**Request:**
```bash
curl -X POST \
  -F "file=@arquivo.psd" \
  http://localhost:5000/api/analyze-psd
```

**Response:**
```json
{
  "success": true,
  "file_info": {
    "original_name": "arquivo.psd",
    "file_id": "uuid-123",
    "size_bytes": 1048576,
    "size_mb": 1.0
  },
  "analysis": {
    "fonts_found": [
      "Arial-BoldMT",
      "Helvetica-Regular"
    ],
    "total_fonts": 2,
    "timestamp": "2024-01-01T12:00:00"
  }
}
```

### **GET /api/health**
Health check da API.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00",
  "version": "1.0.0"
}
```

## 📁 **Estrutura de Arquivos**

```
C:\extrai psd\
├── 📄 psd_api.py                    # Backend API Python
├── 📄 scan_fonts_binary.py         # Script de extração
├── 📄 api_requirements.txt         # Dependências Python
├── 📁 angular-app/                 # Frontend Angular
│   ├── 📁 src/
│   │   ├── 📁 app/
│   │   │   ├── 📁 psd-analyzer/
│   │   │   │   ├── 📄 *.component.ts
│   │   │   │   ├── 📄 *.component.html
│   │   │   │   └── 📄 *.component.scss
│   │   │   └── 📄 app.module.ts
│   │   └── 📁 environments/
│   │       ├── 📄 environment.ts
│   │       └── 📄 environment.prod.ts
│   └── 📄 package.json
└── 📄 README_ANGULAR_INTEGRATION.md
```

## 🎯 **Features Implementadas**

### **Frontend Angular:**
- ✅ **Drag & Drop** de arquivos PSD
- ✅ **Validação** de tipo e tamanho
- ✅ **Upload Progress** com loading
- ✅ **Visualização** de resultados
- ✅ **Download JSON** dos resultados
- ✅ **Copy to Clipboard** da lista de fontes
- ✅ **Responsive Design**

### **Backend Python:**
- ✅ **REST API** com Flask
- ✅ **CORS** habilitado para Angular
- ✅ **Upload seguro** com validações
- ✅ **Análise binária** de PSDs
- ✅ **Cleanup** automático de arquivos temporários
- ✅ **Error handling** robusto

## 🧪 **Testar com Arquivos**

```bash
# Testar API diretamente
curl -X POST \
  -F "file=@C:\Users\rodrigo.noma\Downloads\teste_font.psd" \
  http://localhost:5000/api/analyze-psd
```

**Resultado esperado:**
- ✅ AvianoSansBold
- ✅ AvianoSansThin  
- ✅ MyriadPro-Regular

## 🔒 **Configurações de Segurança**

### **Validações Implementadas:**
- ✅ Tipos de arquivo: `.psd`, `.psb`
- ✅ Tamanho máximo: 50MB
- ✅ Nomes de arquivo seguros
- ✅ Limpeza de arquivos temporários
- ✅ CORS configurado

### **Para Produção:**
1. Desabilitar debug no Flask
2. Configurar reverse proxy (nginx)
3. Usar HTTPS
4. Configurar rate limiting
5. Implementar autenticação se necessário

## 🚀 **Deploy**

### **Development:**
```bash
# Backend
python psd_api.py

# Frontend  
ng serve
```

### **Production:**
```bash
# Build Angular
ng build --prod

# Servir com Flask (Flask serve os arquivos Angular)
python psd_api.py
```

## 🐛 **Troubleshooting**

### **Erro CORS:**
- Verifique se `Flask-CORS` está instalado
- Confirme que API está rodando na porta 5000

### **Upload falha:**
- Verifique tamanho do arquivo (< 50MB)
- Confirme extensão (.psd ou .psb)

### **Angular não conecta:**
- Verifique `environment.ts`
- Confirme que backend está rodando

## 📊 **Métricas de Performance**

- ⚡ **Upload:** ~1-5 segundos (depende do tamanho)
- ⚡ **Análise:** ~0.5-2 segundos
- 💾 **Memória:** Baixo uso (arquivos temporários)
- 🔄 **Throughput:** Múltiplos uploads simultâneos

---

**🎉 Aplicação completa Angular + Python para extração de fontes PSD!**