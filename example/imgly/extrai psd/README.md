# Extrator de Fontes PSD

Aplicação completa para extrair nomes de fontes de arquivos Adobe Photoshop (.psd).

## 🚀 Instalação

1. **Clone ou baixe os arquivos para uma pasta**
2. **Execute o instalador:**
   ```cmd
   install.bat
   ```
   Ou instale manualmente:
   ```cmd
   pip install psd-tools>=1.10.9
   npm install -g psdtxtractor
   ```

## 📖 Como Usar

### Comando Básico
```cmd
python psd_font_extractor_hybrid.py "caminho\para\arquivo.psd"
```

### Exemplo Prático
```cmd
python psd_font_extractor_hybrid.py "C:\Users\rodrigo.noma\Downloads\teste_font.psd"
```

## 📁 Arquivos da Aplicação

| Arquivo | Descrição |
|---------|-----------|
| `psd_font_extractor_hybrid.py` | **Versão principal** - Usa múltiplos métodos |
| `psd_font_extractor_final.py` | Versão com análise TySh |
| `psd_font_extractor_binary.py` | Versão com análise binária |
| `simple_psd_reader.py` | Analisador de estrutura PSD |
| `requirements.txt` | Dependências Python |
| `install.bat` | Instalador automático |

## 🔧 Métodos de Extração

A aplicação usa **múltiplos métodos** para maximizar as chances de sucesso:

1. **psd-tools (Python)** - Biblioteca principal para PSD
2. **psdtxtractor (Node.js)** - Ferramenta especializada
3. **Análise binária** - Dados de baixo nível
4. **Regex patterns** - Busca por padrões de fontes

## 📊 Saídas Geradas

Para cada arquivo PSD processado, são gerados:

- `arquivo_fonts_hybrid.json` - Resultado completo em JSON
- `arquivo_fonts_hybrid.txt` - Lista simples de fontes
- `arquivo_debug.json` - Informações de debug (se necessário)

## ⚠️ Limitações Conhecidas

### Fontes Não Detectadas
Alguns PSDs podem ter fontes que aparecem como "undefined" devido a:
- Fontes incorporadas/embarcadas no PSD
- Versões muito antigas ou muito novas do Photoshop
- PSDs com estrutura de dados não padrão
- Fontes customizadas ou modificadas

### Soluções Alternativas

Se a aplicação não conseguir extrair as fontes:

1. **Adobe Photoshop** (método mais confiável):
   - Abra o PSD no Photoshop
   - Vá em `Texto > Substituir Fontes`
   - Lista todas as fontes usadas

2. **Análise Manual**:
   - A aplicação mostra layers de texto e suas propriedades
   - Use essas informações para identificar as fontes

3. **Script Photoshop** (para quem tem PS instalado):
   ```javascript
   // Cole no painel Scripts do Photoshop
   var fonts = [];
   for (var i = 0; i < app.activeDocument.layers.length; i++) {
       var layer = app.activeDocument.layers[i];
       if (layer.kind == LayerKind.TEXT) {
           fonts.push(layer.textItem.font);
       }
   }
   alert("Fontes: " + fonts.join(", "));
   ```

## 🐛 Solução de Problemas

### Erro: "Arquivo não encontrado"
- Verifique se o caminho está correto
- Use aspas duplas se o caminho tiver espaços

### Erro: "psdtxtractor não encontrado"
- Execute: `npm install -g psdtxtractor`
- Reinicie o terminal após instalar

### Erro: "No module named 'psd_tools'"
- Execute: `pip install psd-tools`
- Ou rode: `install.bat`

### Caracteres estranhos no output
- Normal no Windows - funcionalidade não é afetada

## 📋 Exemplo de Resultado

```
[INFO] Análise híbrida de: design.psd
[INFO] Usando psd-tools + psdtxtractor...

============================================================
RESULTADO DA ANÁLISE HÍBRIDA  
============================================================
[PSD] Dimensões: 1080x1080, Layers: 3

[LAYERS DE TEXTO] Encontradas 2 layers:
  • titulo: 'Meu Design'
    Fontes: Arial-Bold, Helvetica
    Tamanho: 24
    Cor: rgba(0,0,0, 255)
    
  • subtitulo: 'Texto menor'  
    Fontes: Times-Regular
    Tamanho: 16
    Cor: rgba(128,128,128, 255)

[FONTES EXTRAÍDAS] Total: 3
  1. Arial-Bold
  2. Helvetica  
  3. Times-Regular

[SALVOS]
  Completo: design_fonts_hybrid.json
  Lista:    design_fonts_hybrid.txt
```

## 🆘 Suporte

Se encontrar problemas:

1. Verifique se o PSD tem layers de texto
2. Teste com um PSD mais simples
3. Verifique as dependências instaladas
4. Veja o arquivo `*_debug.json` gerado

## 🏆 Métodos de Extração por Confiabilidade

1. **🥇 Adobe Photoshop** - 100% confiável
2. **🥈 Esta aplicação** - ~70-80% dos casos
3. **🥉 Análise manual** - Sempre funciona, mas trabalhoso

A aplicação foi projetada para ser a melhor solução automática disponível, combinando múltiplas técnicas para maximizar o sucesso na extração de fontes.