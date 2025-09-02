# Manual: Como Adicionar Novas Fontes

Este manual ensina como adicionar novas fontes ao sistema de geração de imagens, mesmo sem conhecimento técnico.

## 📁 Passo 1: Adicionar os Arquivos de Fonte

1. **Baixe suas fontes** nos formatos `.ttf` ou `.otf`
2. **Copie os arquivos** para a pasta `fonts` do projeto
3. **Anote os nomes exatos** dos arquivos (incluindo espaços e caracteres especiais)

### ✅ Formatos Aceitos:
- `.ttf` (TrueType Font)
- `.otf` (OpenType Font)

### 📝 Exemplo:
Se você baixou uma fonte chamada "Roboto", os arquivos podem ser:
- `Roboto-Regular.ttf`
- `Roboto-Bold.ttf`
- `Roboto-Light.ttf`

## ⚙️ Passo 2: Configurar no Código

Você precisa editar o arquivo `index.js` em **3 lugares diferentes**. Procure por seções que começam com:

```javascript
text: {
  fonts: [
```

### 🔍 Como Encontrar:
1. Abra o arquivo `index.js`
2. Use Ctrl+F (Windows) ou Cmd+F (Mac) 
3. Procure por: `fonts: [`
4. Você encontrará 3 ocorrências

### ✏️ Como Adicionar:

Para cada fonte, adicione este código **antes** da última fonte da lista:

```javascript
{
  identifier: "nome-da-fonte-peso",
  fontFamily: "Nome da Família",
  fontWeight: PESO,
  fontURI: "file:///fonts/NOME-DO-ARQUIVO.ttf",
  format: "ttf",
  provider: "file",
},
```

## 📊 Tabela de Pesos das Fontes

| Nome do Peso | Valor Numérico |
|--------------|----------------|
| Thin         | 100           |
| Light        | 300           |
| Regular      | 400           |
| Medium       | 500           |
| SemiBold     | 600           |
| Bold         | 700           |
| ExtraBold    | 800           |
| Heavy/Black  | 900           |

## 💡 Exemplos Práticos

### Exemplo 1: Adicionando Roboto
```javascript
{
  identifier: "roboto-regular",
  fontFamily: "Roboto",
  fontWeight: 400,
  fontURI: "file:///fonts/Roboto-Regular.ttf",
  format: "ttf",
  provider: "file",
},
{
  identifier: "roboto-bold",
  fontFamily: "Roboto",
  fontWeight: 700,
  fontURI: "file:///fonts/Roboto-Bold.ttf",
  format: "ttf",
  provider: "file",
},
```

### Exemplo 2: Adicionando Open Sans
```javascript
{
  identifier: "open-sans-light",
  fontFamily: "Open Sans",
  fontWeight: 300,
  fontURI: "file:///fonts/OpenSans-Light.ttf",
  format: "ttf",
  provider: "file",
},
{
  identifier: "open-sans-regular",
  fontFamily: "Open Sans",
  fontWeight: 400,
  fontURI: "file:///fonts/OpenSans-Regular.ttf",
  format: "ttf",
  provider: "file",
},
```

## ⚠️ Regras Importantes

1. **Identifier**: Sempre em minúsculas, use hífen (-) no lugar de espaços
2. **FontFamily**: Nome exato da família da fonte (pode ter espaços)
3. **FontWeight**: Use os valores numéricos da tabela acima
4. **FontURI**: Sempre comece com `file:///fonts/` + nome do arquivo
5. **Format**: Use `"ttf"` para .ttf e `"otf"` para .otf
6. **Provider**: Sempre `"file"`
7. **Vírgula**: Não esqueça da vírgula no final de cada bloco `},`

## 🎯 Como Usar as Fontes nos Templates

Após adicionar as fontes, você pode usá-las nos seus JSONs:

```json
{
  "text/fontFamily": "Roboto",
  "text/fontWeight": 700
}
```

## 🔧 Testando

1. **Reinicie o servidor** após adicionar novas fontes
2. **Teste com um JSON simples** primeiro
3. **Verifique os logs** se houver erro

## 📞 Dicas de Troubleshooting

### ❌ Erro "Font not found":
- Verifique se o arquivo está na pasta `fonts`
- Confirme se o nome do arquivo no `fontURI` está correto (incluindo maiúsculas/minúsculas)
- Certifique-se de que adicionou a fonte nas 3 seções do código

### ❌ Erro de sintaxe:
- Verifique se todas as vírgulas estão no lugar
- Confirme se as aspas estão fechadas corretamente
- Use um validador JSON online para verificar

### ❌ Fonte não aparece:
- Reinicie o servidor
- Verifique se o `fontFamily` no JSON corresponde ao `fontFamily` no código
- Confirme se o `fontWeight` está correto

## ✅ Checklist Final

- [ ] Arquivos de fonte copiados para pasta `fonts`
- [ ] Código adicionado nas 3 seções do `index.js`
- [ ] Nomes dos arquivos conferidos (case-sensitive)
- [ ] Vírgulas e sintaxe verificadas
- [ ] Servidor reiniciado
- [ ] Teste realizado com sucesso

---

💡 **Dica**: Sempre faça backup do arquivo `index.js` antes de fazer alterações!