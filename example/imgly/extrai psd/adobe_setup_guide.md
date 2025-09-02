# 🚀 Guia de Configuração - Adobe Photoshop API

Este é o **método mais avançado e confiável** para extrair fontes de arquivos PSD usando a **API oficial da Adobe**.

## 📋 Pré-requisitos

1. **Conta Adobe** (gratuita)
2. **Acesso ao Adobe Developer Console**
3. **Conhecimento básico de APIs**

## 🔧 Configuração Passo-a-Passo

### 1. Criar Projeto no Adobe Developer Console

1. Acesse: https://developer.adobe.com/developer-console/
2. Faça login com sua conta Adobe
3. Clique em **"Create new project"**
4. Escolha um nome para seu projeto

### 2. Adicionar Photoshop API

1. No projeto criado, clique **"+ Add Service"**
2. Selecione **"API"**
3. Procure e selecione **"Photoshop API"**
4. Clique **"Next"**

### 3. Configurar OAuth Server-to-Server

1. Selecione **"OAuth Server-to-Server"** 
2. Dê um nome para suas credenciais
3. Selecione os **Product Profiles** apropriados
4. Clique **"Save configured API"**

### 4. Obter Credenciais

Após a configuração, você verá:

- ✅ **Client ID** - ID público do seu app
- ✅ **Client Secret** - Chave secreta (mantenha segura!)
- ✅ **Organization ID** - ID da sua organização Adobe

**Exemplo:**
```
Client ID: 1234567890abcdef
Client Secret: p8e-x3i_abc123def456
Organization ID: 12345678901234567890@AdobeOrg
```

## 💻 Usar a Aplicação

### Comando:
```cmd
python adobe_api_font_extractor.py "C:\Users\rodrigo.noma\Downloads\teste_font.psd"
```

### Na primeira execução:
1. Digite suas credenciais quando solicitado
2. Elas serão salvas para uso futuro
3. A autenticação será testada automaticamente

## 🌐 Requisito: Upload do PSD

**IMPORTANTE:** A Adobe API exige que o arquivo PSD esteja em uma **URL pública**. Opções:

### Gratuitas:
- **Google Drive** (link público)
- **Dropbox** (link público) 
- **GitHub** (repositório público)

### Pagas/Profissionais:
- **Amazon S3**
- **Google Cloud Storage**
- **Azure Blob Storage**
- **Adobe Creative SDK Storage**

### Exemplo de URL válida:
```
https://drive.google.com/uc?id=1ABC123...
https://www.dropbox.com/s/abc123/arquivo.psd?raw=1
https://exemplo.s3.amazonaws.com/psds/teste_font.psd
```

## 🔄 Fluxo de Trabalho

1. **Upload** do PSD para storage público
2. **Executar** a aplicação com a URL
3. **Autenticar** com suas credenciais Adobe
4. **Processar** via API (assíncrono)
5. **Receber** resultado com fontes extraídas

## 📊 Resultado Esperado

```json
{
  "fonts_extracted": [
    "Arial-Bold",
    "Helvetica-Light", 
    "Times-Regular"
  ],
  "text_layers": [
    {
      "name": "_bold",
      "text": "WOQMTESTE DE FONT",
      "font": "Arial-Bold",
      "fontSize": 50,
      "color": {"r": 0, "g": 0, "b": 0, "a": 255}
    }
  ],
  "total_fonts": 3,
  "processing_status": "completed"
}
```

## 💰 Custos

- **Adobe Developer Console:** Gratuito
- **Photoshop API:** Consulte preços atuais na Adobe
- **Storage:** Varia por provedor

## ⭐ Vantagens desta Solução

- ✅ **100% Oficial Adobe** - Máxima compatibilidade
- ✅ **Mais Confiável** - Acesso direto aos dados PSD
- ✅ **Informações Completas** - Fontes, tamanhos, cores, etc.
- ✅ **Escalável** - Pode processar muitos arquivos
- ✅ **Profissional** - Ideal para uso comercial

## 🆘 Solução de Problemas

### Erro de Autenticação
- Verifique Client ID, Client Secret e Org ID
- Confirme se a API do Photoshop está ativada

### Erro de URL
- URL deve ser pública e acessível
- Teste a URL no navegador
- Use `?raw=1` para Dropbox

### Erro de Quota
- Verifique limites da sua conta Adobe
- Considere upgrade se necessário

## 🎯 Comparação com Outras Soluções

| Método | Confiabilidade | Facilidade | Custo |
|--------|---------------|------------|-------|
| Adobe API | 🟢 100% | 🟡 Médio | 💰 Pago |
| Nossa App Python | 🟡 70-80% | 🟢 Fácil | 🆓 Grátis |
| Photoshop Manual | 🟢 100% | 🟡 Médio | 💰 PS License |

---

**Recomendação:** Use a Adobe API para **projetos profissionais** onde a precisão é crítica. Para uso ocasional, nossa aplicação Python é suficiente.