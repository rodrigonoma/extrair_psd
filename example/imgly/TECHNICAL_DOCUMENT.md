# Documento Técnico: Projeto de Geração de Imagens com IMG.LY CE.SDK

Este documento detalha a implementação de um serviço Node.js para geração de imagens a partir de templates PSD, utilizando o IMG.LY CreativeEngine SDK (CE.SDK) e o PSD Importer.

## 1. Criação e Configuração do Projeto

O projeto foi iniciado como uma aplicação Node.js básica e as dependências foram adicionadas conforme a necessidade.

### 1.1 Comandos de Criação (Assumidos)

Embora não tenhamos executado o comando `npm init` diretamente, a estrutura do projeto sugere uma inicialização padrão:

```bash
# Inicializa um novo projeto Node.js
npm init -y
```

### 1.2 Bibliotecas Instaladas

As seguintes bibliotecas foram instaladas e são essenciais para o funcionamento do projeto:

| Biblioteca           | Versão (aproximada) | Descrição                                                              |
| :------------------- | :------------------ | :--------------------------------------------------------------------- |
| `@cesdk/node`        | `^1.57.0`           | O SDK principal do CreativeEngine para ambientes Node.js (headless).    |
| `@imgly/psd-importer`| `^0.0.9`            | Ferramenta para importar e parsear arquivos PSD no CE.SDK.             |
| `express`            | `^5.1.0`            | Framework web para Node.js, utilizado para criar as rotas da API.      |
| `pngjs`              | `^7.0.0`            | Biblioteca para codificar/decodificar imagens PNG.                     |
| `node-fetch`         | `^3.0.0`            | (Removido) Utilizado inicialmente para buscar fontes, mas não é mais necessário devido à estratégia de fontes auto-hospedadas. |

**Comandos de Instalação:**

```bash
npm install @cesdk/node @imgly/psd-importer express pngjs
# npm install node-fetch (se necessário para outras funcionalidades de rede)
```

## 2. Métodos Chave do IMG.LY CE.SDK Invocados

O projeto faz uso extensivo dos seguintes métodos do CE.SDK para manipular PSDs e gerar imagens:

### 2.1 `CESDK.init(config)`

Inicializa a instância do CreativeEngine.
*   `license`: Chave de licença do IMG.LY.
*   `headless`: `true` para operação sem interface gráfica.
*   `ui.typefaceLibraries`: `[]` para desabilitar o carregamento de bibliotecas de fontes padrão.
*   `fontResolver`: Função customizada para resolver fontes.
*   `text.fonts`: Array de objetos de fonte para fontes auto-hospedadas.

### 2.2 `PSDParser.fromFile(instance, psdArrayBuffer, createPNGJSEncodeBufferToPNG(PNG))`

Cria uma instância do parser de PSD a partir de um `ArrayBuffer` do arquivo PSD.

### 2.3 `psdParser.parse()`

Executa o parsing do PSD, carregando a cena na instância do CreativeEngine.

### 2.4 `instance.block.findAll()`

Retorna uma lista de IDs de todos os blocos (camadas) na cena.

### 2.5 `instance.block.getName(blockId)`

Retorna o nome de um bloco pelo seu ID.

### 2.6 `instance.block.getType(blockId)`

Retorna o tipo de um bloco (ex: `//ly.img.ubq/text`, `//ly.img.ubq/graphic`).

### 2.7 `instance.block.findByName(name)`

Encontra blocos pelo nome. Retorna um array de IDs de blocos.

### 2.8 `instance.block.setString(blockId, propertyPath, value)`

Define uma propriedade de string para um bloco.
*   **Uso:**
    *   `instance.block.setString(block, 'text/text', 'Novo Texto');` (para conteúdo de texto)
    *   `instance.block.setString(imageFill, 'fill/image/imageFileURI', 'file:///caminho/imagem.png');` (para URI de imagem)

### 2.9 `instance.block.setFloat(blockId, propertyPath, value)`

Define uma propriedade numérica (float) para um bloco.
*   **Uso:**
    *   `instance.block.setFloat(block, 'text/fontSize', 48);` (para tamanho da fonte)
    *   `instance.block.setFloat(block, 'position/x', 100);` (para posição X)
    *   `instance.block.setFloat(block, 'position/y', 200);` (para posição Y)
    *   `instance.block.setFloat(block, 'width', 300);` (para largura)
    *   `instance.block.setFloat(block, 'height', 50);` (para altura)

### 2.10 `instance.block.setColor(fillId, propertyPath, value)`

Define uma propriedade de cor para um objeto `fill`.
*   **Uso:**
    *   `instance.block.setColor(colorFill, 'fill/color/value', { r: 1, g: 0, b: 0, a: 1 });`

### 2.11 `instance.block.createFill(type)`

Cria um novo objeto `fill` (preenchimento) de um determinado tipo (ex: `'color'`, `'image'`).

### 2.12 `instance.block.setFill(blockId, fillId)`

Associa um objeto `fill` a um bloco.

### 2.13 `instance.block.export(blockId, format)`

Exporta um bloco (geralmente o bloco da página principal) para um formato de imagem.

### 2.14 `instance.block.getString(blockId, propertyPath)`

Obtém uma propriedade de string de um bloco.
*   **Uso:**
    *   `instance.block.getString(blockId, 'text/text');` (para obter conteúdo de texto)
    *   `instance.block.getString(imageFillId, 'fill/image/imageFileURI');` (para obter URI de imagem)

### 2.15 `instance.block.getFloat(blockId, propertyPath)`

Obtém uma propriedade numérica de um bloco.
*   **Uso:**
    *   `instance.block.getFloat(blockId, 'text/fontSize');` (para obter tamanho da fonte)
    *   `instance.block.getFloat(blockId, 'position/x');` (para obter posição X)

### 2.16 `instance.block.getColor(fillId, propertyPath)`

Obtém uma propriedade de cor de um objeto `fill`.
*   **Uso:**
    *   `instance.block.getColor(fillColorId, 'fill/color/value');`

### 2.17 `instance.block.getFill(blockId)`

Obtém o ID do objeto `fill` associado a um bloco.

### 2.18 `instance.dispose()`

Libera os recursos da instância do CreativeEngine.

## 3. Propriedades Manipuláveis e Formatos

As propriedades são aplicadas através do objeto `data` enviado no corpo da requisição POST para `/generate-images-batch` ou `/generate-image`. As chaves do objeto `data` devem corresponder aos nomes das camadas no seu arquivo PSD.

### 3.1 Camadas de Texto (`//ly.img.ubq/text`)

| Propriedade | Tipo    | Descrição                                                              | Exemplo de Valor                                     |
| :---------- | :------ | :--------------------------------------------------------------------- | :--------------------------------------------------- |
| `text`      | `string`| O conteúdo textual da camada.                                          | `"Meu Novo Texto"`                                   |
| `fontSize`  | `number`| O tamanho da fonte em pontos.                                          | `48`                                                 |
| `color`     | `object`| A cor do texto no formato RGBA. Componentes de 0 a 1.                  | `{ "r": 1, "g": 0.5, "b": 0, "a": 1 }` (Laranja opaco) |
| `position`  | `object`| Posição e dimensões do bloco.                                          | `{ "x": 100, "y": 200, "width": 500, "height": 80 }` |

### 3.2 Camadas Gráficas (`//ly.img.ubq/graphic`)

| Propriedade | Tipo    | Descrição                                                              | Exemplo de Valor                                     |
| :---------- | :------ | :--------------------------------------------------------------------- | :--------------------------------------------------- |
| `uri`       | `string`| URI da imagem a ser usada como preenchimento. Pode ser `file:///` ou `https://`. | `"file:///C:/caminho/para/sua/nova/imagem.png"`      |
| `position`  | `object`| Posição e dimensões do bloco.                                          | `{ "x": 50, "y": 200, "width": 600, "height": 300 }` |
| `backgroundColor` | `object`| A cor de fundo do bloco no formato RGBA. Componentes de 0 a 1. Se não presente, a cor do preenchimento sólido (`fill/solid/color`) será usada na extração. | `{ "r": 0, "g": 0, "b": 1, "a": 1 }` (Azul opaco) |

**Exemplo de JSON de Entrada (Body da Requisição):**

```json
{
  "psdPath": "C:/caminho/para/seu/template.psd",
  "items": [
    {
      "data": {
        "NomeDaCamadaDeTextoNoPSD": {
          "text": "Texto Atualizado",
          "fontSize": 42,
          "color": { "r": 0, "g": 0, "b": 1, "a": 1 },
          "position": { "x": 10, "y": 20, "width": 300, "height": 50 }
        },
        "NomeDaCamadaDeImagemNoPSD": {
          "uri": "file:///C:/caminho/para/outra/imagem.jpg",
          "position": { "x": 50, "y": 50, "width": 200, "height": 150 }
        },
        "OutraCamadaDeTexto": {
          "text": "Apenas texto novo"
        }
      }
    }
  ],
  "outputPathBase": "C:/caminho/para/saida/output_"
}
```

## 4. Fontes Auto-Hospedadas

O projeto está configurado para usar fontes auto-hospedadas localizadas na pasta `fonts/`. O `fontResolver` customizado garante que o CESDK possa encontrar e utilizar essas fontes.

As fontes são configuradas no `CESDK.init` sob `text.fonts`:

```javascript
text: {
  fonts: [
    {
      identifier: 'bebas-neue-bold',
      fontFamily: 'Bebas Neue',
      fontWeight: 700,
      fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Bold.otf',
      format: 'otf',
      provider: 'file'
    },
    // ... outras variantes da fonte Bebas Neue
  ]
}
```

## 5. Tratamento de Erros e Logs

O serviço inclui um sistema de log (`logToFile`) que registra mensagens de depuração e erros no arquivo `log_error.txt`. Isso é crucial para o diagnóstico de problemas durante a geração de imagens.

## 6. Rotas da API

O servidor Express.js expõe as seguintes rotas:

*   **`POST /generate-image`**: Gera uma única imagem.
    *   **Body:** `{ psdPath: string, data: object, outputPath: string }`
*   **`POST /generate-images-batch`**: Gera múltiplas imagens em lote.
    *   **Body:** `{ psdPath: string, items: Array<{ data: object }>, outputPathBase: string }`
*   **`POST /extract-psd-data`**: Extrai informações de componentes de um PSD e salva em um arquivo.
    *   **Body:** `{ psdPath: string }`
    *   **Saída:** `dados_psd_original.txt` no diretório raiz do projeto, contendo um JSON detalhado com todas as propriedades extraídas de cada componente do PSD.

## 7. Utilizando PSDs com Novas Fontes

Se você precisar utilizar um PSD que emprega fontes diferentes das que já estão configuradas (`Bebas Neue`), é necessário seguir um procedimento para que o CreativeEngine SDK possa carregar e renderizar essas novas fontes corretamente.

O `fontResolver` customizado e a configuração `text.fonts` no `CESDK.init` são os pontos chave para gerenciar fontes auto-hospedadas.

### Procedimento para Adicionar Novas Fontes:

1.  **Obtenha os Arquivos da Fonte:**
    *   Certifique-se de ter os arquivos da fonte (geralmente `.otf` ou `.ttf`) para todas as variantes (Regular, Bold, Italic, etc.) que são usadas no seu PSD.

2.  **Organize os Arquivos da Fonte:**
    *   Crie uma subpasta dentro do diretório `fonts/` do projeto (ex: `fonts/MinhaNovaFonte/`) ou coloque os arquivos diretamente em `fonts/`. Mantenha a organização para facilitar a manutenção.

3.  **Atualize a Configuração `text.fonts` no `index.js`:**
    *   Abra o arquivo `index.js`.
    *   Localize a seção `text.fonts` dentro do `CESDK.init` (presente nas rotas `/generate-images-batch` e `/generate-image`).
    *   Para cada variante da nova fonte, adicione um novo objeto à array `fonts`. Preencha as propriedades cuidadosamente:
        *   `identifier`: Um identificador único para a fonte (ex: `'minha-nova-fonte-regular'`).
        *   `fontFamily`: O nome da família da fonte (exatamente como aparece no PSD, ex: `'Minha Nova Fonte'`).
        *   `fontWeight`: O peso da fonte (ex: `400` para Regular, `700` para Bold, `300` para Light).
        *   `fontURI`: O caminho absoluto para o arquivo da fonte no seu sistema, usando o prefixo `file:///`. 
            *   Ex: `'file:///C:/imgly_novo/fonts/MinhaNovaFonte/MinhaNovaFonte-Regular.otf'`
        *   `format`: O formato do arquivo da fonte (ex: `'otf'`, `'ttf'`).
        *   `provider`: Deve ser `'file'` para fontes locais.

    **Exemplo de Adição de uma Nova Fonte (`Minha Nova Fonte`):**

    ```javascript
    // ... dentro de CESDK.init({ text: { fonts: [ ... ] } })
    {
      identifier: 'minha-nova-fonte-regular',
      fontFamily: 'Minha Nova Fonte',
      fontWeight: 400, // Ou 'normal'
      fontURI: 'file:///C:/imgly_novo/fonts/MinhaNovaFonte/MinhaNovaFonte-Regular.otf',
      format: 'otf',
      provider: 'file'
    },
    {
      identifier: 'minha-nova-fonte-bold',
      fontFamily: 'Minha Nova Fonte',
      fontWeight: 700, // Ou 'bold'
      fontURI: 'file:///C:/imgly_novo/fonts/MinhaNovaFonte/MinhaNovaFonte-Bold.otf',
      format: 'otf',
      provider: 'file'
    },
    // ... adicione outras variantes (Light, Italic, etc.) conforme necessário
    ```

4.  **Reinicie a Aplicação:**
    *   Após salvar as alterações em `index.js`, **reinicie o servidor Node.js** para que as novas configurações de fonte sejam carregadas.

5.  **Teste com o Novo PSD:**
    *   Agora você pode usar o novo PSD. O `fontResolver` tentará corresponder as fontes solicitadas pelo PSD com as fontes que você configurou em `text.fonts`.

**Considerações Importantes:**

*   **Nomes Exatos:** O `fontFamily` e `fontWeight` configurados devem corresponder o mais próximo possível ao que está definido no PSD. Pequenas diferenças podem impedir o carregamento correto da fonte.
*   **Caminhos Absolutos:** Sempre use caminhos absolutos com o prefixo `file:///` para `fontURI`.
*   **Licenciamento de Fontes:** Certifique-se de ter as licenças apropriadas para usar e distribuir as fontes em seu projeto.

## 8. Referência: `font-resolver.ts` do `psd-importer` e Nosso Caso

O arquivo `font-resolver.ts` encontrado no repositório `imgly/psd-importer` (especificamente em `https://github.com/imgly/psd-importer/blob/main/src/lib/psd-parser/font-resolver.ts`) é um exemplo genérico de resolvedor de fontes projetado principalmente para integrar-se com **Google Fonts** e outras bibliotecas de ativos online.

Ele não funcionou diretamente para o nosso caso pelas seguintes razões:

1.  **Dependência de Busca Externa:** O `font-resolver.ts` original tenta buscar um arquivo `content.json` de uma URL estática (`https://staticimgly.com/.../google-fonts/content.json`). No nosso projeto, estamos utilizando **fontes auto-hospedadas localmente** (as fontes "Bebas Neue" na pasta `fonts/`). A tentativa de buscar esse recurso externo resultava em um erro `HTTP error! status: 404` porque o arquivo não existia ou não era necessário para o nosso setup.

2.  **Mecanismo de Resolução de Ativos:** O resolvedor original utiliza `engine.asset.findAssets(defaultTypefaceLibrary, ...)` para encontrar as fontes. Isso pressupõe que uma "biblioteca de tipos de letra padrão" (`ly.img.google-fonts`) esteja registrada e contenha os metadados das fontes. Como não estamos usando o Google Fonts e removemos o mock inicial para essa biblioteca (que foi reintroduzido apenas para satisfazer uma verificação interna do `psd-importer`), a chamada a `findAssets` falhava com o erro `The default typeface library ly.img.google-fonts is not available.`.

Nossa solução adaptada (`customFontResolver` em `index.js`) resolveu esses problemas ao:
*   **Remover a dependência de busca externa** de `content.json`.
*   **Direcionar a busca de fontes diretamente para a lista de fontes auto-hospedadas** que já são configuradas no `CESDK.init` (`engine.config.text.fonts`), em vez de tentar consultar uma biblioteca de ativos externa.
*   Manter o mock mínimo para `ly.img.google-fonts` apenas para satisfazer as verificações internas do `psd-importer` que esperam a existência dessa biblioteca, sem que ela precise carregar fontes reais.

Em essência, adaptamos a *lógica* de correspondência de fontes do exemplo original, mas a aplicamos a um *contexto de fontes locais* já carregadas, em vez de um contexto de fontes externas ou de bibliotecas de ativos.
