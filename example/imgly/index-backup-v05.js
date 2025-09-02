const CESDK = require("@cesdk/node")

const fs = require("fs")
const express = require("express")
const { PSDParser, createPNGJSEncodeBufferToPNG } = require("@imgly/psd-importer") // Importa PSDParser e o encoder
const { PNG } = require("pngjs") // Importa o módulo PNG do pngjs
const app = express()
const port = 3000

// Middleware para parsear o corpo das requisições JSON
app.use(express.json())

// Função para registrar logs em um arquivo
function logToFile(message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  console.log(`[LOGGING TO FILE] ${logMessage.trim()}`) // Fallback para console
  try {
    fs.appendFileSync("log_error.txt", logMessage, { encoding: "utf8", flag: "a" })
  } catch (error) {
    console.error(`ERRO AO ESCREVER NO LOG_ERROR.TXT: ${error.message}`)
  }
}

// Helper functions and maps for font resolution
const WEIGHTS = ["thin", "extraLight", "light", "normal", "medium", "semiBold", "bold", "extraBold", "heavy"]

const WEIGHT_ALIAS_MAP = {
  100: "thin",
  200: "extraLight",
  300: "light",
  regular: "normal",
  400: "normal",
  500: "medium",
  600: "semiBold",
  700: "bold",
  800: "extraBold",
  900: "heavy",
}

const TYPEFACE_ALIAS_MAP = {
  Helvetica: "Roboto",
  "Times New Roman": "Tinos",
  Arial: "Arimo",
  Georgia: "Tinos",
  Garamond: "EB Garamond",
  Futura: "Raleway",
  "Comic Sans MS": "Comic Neue",
}

function isEqualWeight(weightString, fontWeight) {
  if (weightString && weightString === fontWeight) {
    return true
  }
  const lowerCaseWeightString = weightString.toLowerCase()
  if (lowerCaseWeightString === fontWeight) {
    return true
  }
  const weightAlias = WEIGHT_ALIAS_MAP[lowerCaseWeightString]
  if (weightAlias !== undefined) {
    return true
  }
  return false
}

function pascalCaseToArray(pascalCaseString) {
  const spacedString = pascalCaseString.replace(/([A-Z])/g, " $1").trim()
  const words = spacedString.split(" ")
  if (words.length < 2) {
    return []
  }
  const result = []
  for (let i = words.length; i > 0; i--) {
    const currentWords = words.slice(0, i).join(" ")
    result.push(currentWords)
  }
  return result
}

async function customFontResolver(fontParameters, engine) {
  logToFile(
    `[CustomFontResolver] Tentando resolver a fonte: ${fontParameters.family}, style: ${fontParameters.style}, weight: ${fontParameters.weight}`,
  )

  const configuredFonts = engine.config.text.fonts // Access fonts directly from engine config

  let familyToSearch = fontParameters.family
  if (familyToSearch in TYPEFACE_ALIAS_MAP) {
    familyToSearch = TYPEFACE_ALIAS_MAP[familyToSearch]
    logToFile(`[CustomFontResolver] Usando alias para família de fonte: ${fontParameters.family} -> ${familyToSearch}`)
  }

  // Try to find a direct match
  let foundFont = configuredFonts.find((f) => {
    const familyMatch = f.fontFamily === familyToSearch
    const styleMatch = fontParameters.style === undefined || f.style?.toLowerCase() === f.style?.toLowerCase() // Corrected: f.style?.toLowerCase()
    const weightMatch = fontParameters.weight === undefined || isEqualWeight(fontParameters.weight, f.fontWeight)
    return familyMatch && styleMatch && weightMatch
  })

  if (!foundFont) {
    // If no direct match, try with pascalCaseToArray for family
    const queries = pascalCaseToArray(familyToSearch)
    for (const query of queries) {
      foundFont = configuredFonts.find((f) => {
        const familyMatch = f.fontFamily === query
        const styleMatch = fontParameters.style === undefined || f.style?.toLowerCase() === f.style?.toLowerCase() // Corrected: f.style?.toLowerCase()
        const weightMatch = fontParameters.weight === undefined || isEqualWeight(fontParameters.weight, f.fontWeight)
        return familyMatch && styleMatch && weightMatch
      })
      if (foundFont) {
        logToFile(`[CustomFontResolver] Fonte encontrada via pascalCaseToArray: ${query}`)
        break
      }
    }
  }

  if (!foundFont) {
    logToFile(`[CustomFontResolver] Nenhuma fonte encontrada para ${fontParameters.family} após tentativas.`)
    return null
  }

  // For local fonts, the typeface and font are essentially the same object
  // The CESDK font resolver expects a { typeface, font } object.
  // We can construct a minimal typeface object from the found font.
  const typeface = {
    id: foundFont.identifier,
    name: foundFont.fontFamily,
    fonts: [foundFont], // The typeface contains the specific font
  }

  logToFile(
    `[CustomFontResolver] Fonte resolvida: ${foundFont.fontFamily}, ${foundFont.style}, ${foundFont.fontWeight}`,
  )
  return {
    typeface,
    font: foundFont,
  }
}

// Função para gerar uma única imagem
async function generateSingleImage(instance, psdPath, data, outputPath) {
  logToFile(`[generateSingleImage] Iniciando geração para: ${outputPath}`)
  try {
    const psdBuffer = fs.readFileSync(psdPath) // Retorna um Node.js Buffer
    // Converte o Node.js Buffer para um ArrayBuffer
    const psdArrayBuffer = psdBuffer.buffer.slice(psdBuffer.byteOffset, psdBuffer.byteOffset + psdBuffer.byteLength)

    logToFile(`Tamanho do psdArrayBuffer: ${psdArrayBuffer.byteLength} bytes`)

    // Cria uma instância do PSDParser e então chama o método parse
    const psdParser = await PSDParser.fromFile(instance, psdArrayBuffer, createPNGJSEncodeBufferToPNG(PNG)) // <--- AGORA COM AWAIT

    logToFile(`Tipo de psdParser: ${typeof psdParser}`)

    // Executa o parse do PSD, que carrega a cena na instância
    await psdParser.parse()

    // Loga todos os blocos na cena para depuração
    const allBlocks = instance.block.findAll()
    const blockDetails = allBlocks.map((blockId) => ({
      id: blockId,
      name: instance.block.getName(blockId),
      type: instance.block.getType(blockId),
    }))
    logToFile(`Todos os blocos na cena (ID, Nome, Tipo): ${JSON.stringify(blockDetails, null, 2)}`)

    // Lógica para aplicar dados às camadas de texto e imagem
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const block = instance.block.findByName(key)[0]
        if (block) {
          const blockType = instance.block.getType(block)
          logToFile(`[ApplyData] Camada '${key}' encontrada. Tipo: ${blockType}`)
          if (blockType === "//ly.img.ubq/text" || blockType === "//ly.img.ubq/graphic") {
            // Iterar sobre todas as propriedades fornecidas no data[key]
            for (const propName in data[key]) {
              if (data[key].hasOwnProperty(propName)) {
                const propValue = data[key][propName]

                // Ignorar 'uri' e 'position' se já foram tratados ou serão tratados separadamente
                if (propName === "uri" || propName === "position" || propName === "backgroundColor") {
                  continue // Já tratado ou será tratado abaixo
                }

                try {
                  // Tentar definir a propriedade com base no tipo de dado ou nome da propriedade
                  if (typeof propValue === "string") {
                    instance.block.setString(block, propName, propValue)
                    logToFile(`[ApplyData] Propriedade string '${propName}' atualizada para: '${propValue}'`)
                  } else if (typeof propValue === "number") {
                    instance.block.setFloat(block, propName, propValue)
                    logToFile(`[ApplyData] Propriedade float '${propName}' atualizada para: ${propValue}`)
                  } else if (typeof propValue === "boolean") {
                    instance.block.setBool(block, propName, propValue)
                    logToFile(`[ApplyData] Propriedade boolean '${propName}' atualizada para: ${propValue}`)
                  } else if (typeof propValue === "object" && propValue !== null) {
                    // Tentar como cor se tiver r, g, b, a
                    if ("r" in propValue && "g" in propValue && "b" in propValue && "a" in propValue) {
                      // Para cores, precisamos criar um fill de cor e associá-lo, ou usar backgroundColor/color
                      // Dependendo do propName, pode ser backgroundColor/color ou text/fill/color
                      if (propName === "color" && blockType === "//ly.img.ubq/text") {
                        const colorFill = instance.block.createFill("color")
                        instance.block.setColor(colorFill, "fill/color/value", propValue)
                        instance.block.setFill(block, colorFill)
                        logToFile(
                          `[ApplyData] Cor de texto '${propName}' atualizada para: ${JSON.stringify(propValue)}`,
                        )
                      } else if (propName === "backgroundColor" && blockType === "//ly.img.ubq/graphic") {
                        instance.block.setColor(block, "backgroundColor/color", propValue)
                        logToFile(
                          `[ApplyData] Cor de fundo '${propName}' atualizada para: ${JSON.stringify(propValue)}`,
                        )
                      } else {
                        // Para outras propriedades de cor genéricas, tentar setar diretamente
                        instance.block.setColor(block, propName, propValue)
                        logToFile(
                          `[ApplyData] Propriedade de cor genérica '${propName}' atualizada para: ${JSON.stringify(propValue)}`,
                        )
                      }
                    } else {
                      // Para outros objetos (structs), tentar setStruct
                      instance.block.setStruct(block, propName, propValue)
                      logToFile(
                        `[ApplyData] Propriedade struct '${propName}' atualizada para: ${JSON.stringify(propValue)}`,
                      )
                    }
                  } else {
                    logToFile(
                      `[ApplyData] Tipo de dado desconhecido para propriedade '${propName}': ${typeof propValue}. Ignorando.`,
                    )
                  }
                } catch (e) {
                  logToFile(`[ApplyData] Erro ao definir propriedade '${propName}' para ${key}: ${e.message}`)
                }
              }
            }

            // Tratamento específico para URI de imagem (se for graphic)
            if (blockType === "//ly.img.ubq/graphic" && data[key].uri !== undefined) {
              const imageFill = instance.block.createFill("image")
              instance.block.setString(imageFill, "fill/image/imageFileURI", data[key].uri)
              instance.block.setFill(block, imageFill)
              logToFile(`[ApplyData] Imagem da camada '${key}' atualizada para: '${data[key].uri}'`)
            }

            // Tratamento específico para posicionamento (se for text ou graphic)
            if (data[key].position !== undefined) {
              const { x, y, width, height } = data[key].position
              instance.block.setFloat(block, "position/x", x)
              instance.block.setFloat(block, "position/y", y)
              instance.block.setFloat(block, "width", width)
              instance.block.setFloat(block, "height", height)
              logToFile(
                `[ApplyData] Posição/Tamanho da camada '${key}' atualizado para: x=${x}, y=${y}, w=${width}, h=${height}`,
              )
            }
          } else {
            logToFile(
              `[ApplyData] Camada '${key}' encontrada, mas não é do tipo texto ou gráfico. Ignorando por enquanto.`,
            )
          }
        } else {
          logToFile(`[ApplyData] Camada com o nome '${key}' não encontrada no PSD.`)
        }
      }
    }

    // Encontra o bloco da página principal para exportar
    const pageBlock = instance.block.findByType("page")[0]
    if (!pageBlock) {
      throw new Error("Nenhum bloco de página encontrado na cena.")
    }

    const result = await instance.block.export(pageBlock, "image/png")
    const imageBuffer = Buffer.from(await result.arrayBuffer())

    logToFile(`Tentando salvar imagem em: ${outputPath}`)
    fs.writeFileSync(outputPath, imageBuffer)
    logToFile(`fs.writeFileSync executado para: ${outputPath}`)

    if (fs.existsSync(outputPath)) {
      logToFile(`Arquivo ${outputPath} existe após escrita.`)
    } else {
      logToFile(`ERRO: Arquivo ${outputPath} NÃO existe após escrita.`)
    }

    logToFile(`Imagem gerada com sucesso em: ${outputPath}`)
    return { success: true, message: `Imagem gerada com sucesso em: ${outputPath}` }
  } catch (error) {
    console.log(`[DEBUG] Tentando logar erro de generateSingleImage...`)
    logToFile(
      `Erro ao gerar imagem: ${error?.message || error}\nNome do Erro: ${error?.name}\nErro Completo: ${error?.toString()}\nStack: ${error?.stack}`,
    ) // Registra o erro detalhado no arquivo
    console.log(`[DEBUG] Erro de generateSingleImage logado.`)
    return { success: false, message: "Erro ao gerar imagem", error: error?.message || error }
  }
}

// Rota POST para gerar múltiplas imagens
app.post("/generate-images-batch", async (req, res) => {
  const { psdPath, items, outputPathBase } = req.body

  if (!psdPath || !items || !Array.isArray(items) || !outputPathBase) {
    return res
      .status(400)
      .json({ success: false, message: "Parâmetros psdPath, items (array) e outputPathBase são obrigatórios." })
  }

  let instance = null
  const results = []

  try {
    instance = await CESDK.init({
      license: "GoLCfXI3NJKzx27wMBOCHQSdQEj6Z5lpzq7ubQGrk6u-e6ymEsPzZ4tso5Dxe4vx", // Sua licença
      headless: true,
      ui: { typefaceLibraries: [] }, // Não carrega bibliotecas de fontes padrão
      fontResolver: customFontResolver,
      // Configuração para fontes auto-hospedadas
      text: {
        fonts: [
          {
            identifier: "bebas-neue-bold",
            fontFamily: "Bebas Neue",
            fontWeight: 700,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Bold.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-book",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Book.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-light",
            fontFamily: "Bebas Neue",
            fontWeight: 300,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Light.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-regular",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Regular.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-thin",
            fontFamily: "Bebas Neue",
            fontWeight: 100,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Thin.otf",
            format: "otf",
            provider: "file",
          },
        ],
      },
    })

    // Mock para ly.img.google-fonts
    instance.asset.addLocalSource("ly.img.google-fonts", {
      type: "ly.img.asset.typeface",
      payload: {
        typefaces: [],
      },
    })

    for (let i = 0; i < items.length; i++) {
      const itemData = items[i].data
      const uniqueOutputPath = `${outputPathBase}${i}.png`
      logToFile(`Processando item ${i + 1}/${items.length} para ${uniqueOutputPath}`)
      const itemResult = await generateSingleImage(instance, psdPath, itemData, uniqueOutputPath)
      results.push({ index: i, outputPath: uniqueOutputPath, ...itemResult })
    }

    res.json({ success: true, results })
  } catch (error) {
    console.log(`[DEBUG] Tentando logar erro de generate-images-batch...`)
    logToFile(`Erro no processamento em lote: ${error.message}\nStack: ${error.stack}`)
    console.log(`[DEBUG] Erro de generate-images-batch logado.`)
    res.status(500).json({ success: false, message: "Erro no processamento em lote", error: error.message })
  } finally {
    if (instance) {
      instance.dispose() // Libera os recursos do CE.SDK
    }
  }
})

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`)
  console.log(
    `Envie requisições POST para http://localhost:${port}/generate-image ou http://localhost:${port}/generate-images-batch`,
  )
  logToFile(`Servidor iniciado em http://localhost:${port}`)
})

// Nova rota POST para extrair dados do PSD
app.post("/extract-psd-data", async (req, res) => {
  const { psdPath } = req.body

  if (!psdPath) {
    return res.status(400).json({ success: false, message: "Parâmetro psdPath é obrigatório." })
  }

  let instance = null
  const extractedData = {}

  try {
    instance = await CESDK.init({
      license: "GoLCfXI3NJKzx27wMBOCHQSdQEj6Z5lpzq7ubQGrk6u-e6ymEsPzZ4tso5Dxe4vx", // Sua licença
      headless: true,
      ui: { typefaceLibraries: [] },
      fontResolver: customFontResolver,
      text: {
        fonts: [
          {
            identifier: "bebas-neue-bold",
            fontFamily: "Bebas Neue",
            fontWeight: 700,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Bold.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-book",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Book.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-light",
            fontFamily: "Bebas Neue",
            fontWeight: 300,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Light.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-regular",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Regular.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-thin",
            fontFamily: "Bebas Neue",
            fontWeight: 100,
            fontURI: "file:///C:/imgly_novo/fonts/BebasNeue Thin.otf",
            format: "otf",
            provider: "file",
          },
        ],
      },
    })

    instance.asset.addLocalSource("ly.img.google-fonts", {
      type: "ly.img.asset.typeface",
      payload: {
        typefaces: [],
      },
    })

    const psdBuffer = fs.readFileSync(psdPath)
    const psdArrayBuffer = psdBuffer.buffer.slice(psdBuffer.byteOffset, psdBuffer.byteOffset + psdBuffer.byteLength)
    const psdParser = await PSDParser.fromFile(instance, psdArrayBuffer, createPNGJSEncodeBufferToPNG(PNG))
    await psdParser.parse()

    const allBlocks = instance.block.findAll()
    for (const blockId of allBlocks) {
      const name = instance.block.getName(blockId)
      const type = instance.block.getType(blockId)
      const properties = { type }

      if (name) {
        // Only process named blocks
        properties.name = name

        console.log(`[v0] Processing block: ${name}, type: ${type}`)

        // Extrair todas as propriedades do bloco
        const blockProperties = instance.block.findAllProperties(blockId)
        for (const propPath of blockProperties) {
          try {
            let value
            if (propPath.includes("color")) {
              value = instance.block.getColor(blockId, propPath)
            } else if (
              // String properties
              propPath.includes("text/text") ||
              propPath.includes("text/typeFace") ||
              propPath.includes("text/fontFamily") ||
              propPath.includes("text/fontName") ||
              propPath === "text/fontFileUri" || // Added specific handling for text/fontFileUri
              propPath.includes("uri") ||
              propPath.includes("name") ||
              propPath.includes("type") ||
              propPath.includes("identifier") ||
              propPath.includes("format") ||
              propPath.includes("provider") ||
              propPath.includes("externalReference")
            ) {
              value = instance.block.getString(blockId, propPath)
            } else if (
              // Boolean properties - specific handling
              propPath === "text/hasClippedLines" ||
              propPath === "text/automaticFontSizeEnabled" ||
              propPath === "text/clipLinesOutsideOfFrame" ||
              propPath.includes("alwaysOnBottom") ||
              propPath.includes("alwaysOnTop") ||
              propPath.includes("dropShadow/clip") ||
              propPath.includes("highlightEnabled") ||
              propPath.includes("includedInExport") ||
              propPath.includes("placeholderControls/showButton") ||
              propPath.includes("placeholderControls/showOverlay") ||
              propPath.includes("playback/looping") ||
              propPath.includes("playback/muted") ||
              propPath.includes("playback/playing") ||
              propPath.includes("playback/soloPlaybackEnabled") ||
              propPath.includes("selected") ||
              propPath.includes("transformLocked") ||
              propPath.includes("placeholderBehavior/enabled") ||
              propPath.includes("enabled") ||
              propPath.includes("visible") ||
              propPath.includes("clipped") ||
              propPath.includes("locked") ||
              propPath === "fill/includedInExport" ||
              propPath === "fill/placeholderBehavior/enabled"
            ) {
              value = instance.block.getBool(blockId, propPath)
            } else if (
              // Enum properties
              propPath.includes("text/horizontalAlignment") ||
              propPath.includes("text/verticalAlignment") ||
              propPath.includes("blend/mode") ||
              propPath.includes("contentFill/mode") ||
              propPath.includes("height/mode") ||
              propPath.includes("position/x/mode") ||
              propPath.includes("position/y/mode") ||
              propPath.includes("stroke/cornerGeometry") ||
              propPath.includes("stroke/position") ||
              propPath.includes("stroke/style") ||
              propPath.includes("width/mode")
            ) {
              value = instance.block.getEnum(blockId, propPath)
            } else if (
              // Double properties
              propPath.includes("playback/duration") ||
              propPath.includes("playback/time") ||
              propPath.includes("playback/timeOffset")
            ) {
              value = instance.block.getDouble(blockId, propPath)
            } else if (
              // Float properties - specific text properties
              propPath.includes("text/fontSize") ||
              propPath.includes("text/letterSpacing") ||
              propPath.includes("text/lineHeight") ||
              propPath.includes("text/paragraphSpacing") ||
              propPath.includes("text/maxAutomaticFontSize") ||
              propPath.includes("text/minAutomaticFontSize") ||
              propPath.includes("size") ||
              propPath.includes("width") ||
              propPath.includes("height") ||
              propPath.includes("x") ||
              propPath.includes("y") ||
              propPath.includes("weight") ||
              propPath.includes("opacity") ||
              propPath.includes("rotation")
            ) {
              value = instance.block.getFloat(blockId, propPath)
            } else {
              // Try different methods in order of likelihood
              try {
                value = instance.block.getString(blockId, propPath)
              } catch (e) {
                try {
                  value = instance.block.getBool(blockId, propPath)
                } catch (e) {
                  try {
                    value = instance.block.getFloat(blockId, propPath)
                  } catch (e) {
                    try {
                      value = instance.block.getEnum(blockId, propPath)
                    } catch (e) {
                      try {
                        value = instance.block.getDouble(blockId, propPath)
                      } catch (e) {
                        if (e.message.includes("Property is not readable")) {
                          continue
                        }
                        logToFile(`[ExtractData] Não foi possível extrair ${propPath} para ${name}: ${e.message}`)
                        continue
                      }
                    }
                  }
                }
              }
            }
            properties[propPath] = value
          } catch (e) {
            if (e.message.includes("Property is not readable")) {
              continue
            }
            logToFile(`[ExtractData] Erro ao extrair propriedade ${propPath} para ${name}: ${e.message}`)
          }
        }

        const isTextBlock =
          type.includes("text") ||
          properties["text/text"] !== undefined ||
          blockProperties.some((prop) => prop.startsWith("text/"))

        if (isTextBlock) {
          console.log(`[v0] DETECTED TEXT BLOCK: ${name} (type: ${type})`)
          console.log(`[v0] Extracting text properties for block: ${name}`)

          try {
            // Get text content length for range operations
            const textContent = instance.block.getString(blockId, "text/text") || ""
            const textLength = textContent.length
            console.log(`[v0] Text content: "${textContent}", length: ${textLength}`)

            let fontNameExtracted = false

            try {
              // Method 1: Try getTypeface()
              properties.defaultTypeFace = instance.block.getTypeFace(blockId)
              console.log(`[v0] SUCCESS - defaultTypeFace:`, properties.defaultTypeFace)

              // Extract font name from typeface object
              if (properties.defaultTypeFace && properties.defaultTypeFace.name) {
                properties.fontName = properties.defaultTypeFace.name
                fontNameExtracted = true
                console.log(`[v0] SUCCESS - extracted font name: ${properties.fontName}`)
              }
            } catch (e) {
              console.log(`[v0] FAILED - defaultTypeface: ${e.message}`)

              // Method 2: Try getTypefaces() with range
              try {
                if (textLength > 0) {
                  properties.typeFaces = instance.block.getTypeFaces(blockId, 0, textLength)
                  console.log(`[v0] SUCCESS - typefaces (with range):`, properties.typeFaces)
                } else {
                  properties.typeFaces = instance.block.getTypeFaces(blockId)
                  console.log(`[v0] SUCCESS - typefaces (no range):`, properties.typeFaces)
                }

                // Extract font family names from typefaces
                if (properties.typeFaces && properties.typeFaces.length > 0) {
                  properties.fontFamilies = properties.typeFaces.map((typeface) => typeFace.name || typeFace.id)
                  properties.defaultTypeFace = properties.typefaces[0] // Use first typeface as default
                  properties.fontName = properties.typeFaces[0].name || properties.typeFaces[0].id
                  fontNameExtracted = true
                  console.log(`[v0] SUCCESS - extracted font families:`, properties.fontFamilies)
                  console.log(`[v0] SUCCESS - extracted font name: ${properties.fontName}`)
                }
              } catch (e2) {
                console.log(`[v0] FAILED - typefaces: ${e2.message}`)
              }

              logToFile(`[ExtractData] Erro ao extrair defaultTypeface para ${name}: ${e.message}`)
            }

            if (!fontNameExtracted) {
              // Method 3: Try to extract font name from text/typeface property (already extracted above)
              if (properties["text/typeFace"] && properties["text/typeFace"] !== "") {
                properties.fontName = properties["text/typeFace"]
                fontNameExtracted = true
                console.log(`[v0] SUCCESS - font name from text/typeFace property: ${properties.fontName}`)
              }

              // Method 4: Try to extract from text/fontFileUri
              if (!fontNameExtracted) {
                try {
                  const fontFileUri = properties["text/fontFileUri"]
                  if (fontFileUri && fontFileUri !== "") {
                    // Extract font name from file path
                    const fontFileName = fontFileUri.split("/").pop().split("\\").pop()
                    properties.fontName = fontFileName.replace(/\.(ttf|otf|woff|woff2)$/i, "")
                    fontNameExtracted = true
                    console.log(`[v0] SUCCESS - font name from fontFileUri: ${properties.fontName}`)
                  }
                } catch (e3) {
                  console.log(`[v0] FAILED - fontFileUri extraction: ${e3.message}`)
                }
              }

              // Method 5: Try to infer font type from text properties
              if (!fontNameExtracted) {
                try {
                  const fontSize = properties["text/fontSize"]
                  const letterSpacing = properties["text/letterSpacing"]
                  const lineHeight = properties["text/lineHeight"]

                  // Simple heuristics based on common font characteristics
                  let inferredFont = "Unknown Font"

                  if (fontSize && fontSize > 24) {
                    inferredFont = "Display Font (Large Text)"
                  } else if (letterSpacing && letterSpacing > 0.1) {
                    inferredFont = "Spaced Font (High Letter Spacing)"
                  } else if (lineHeight && lineHeight < 1.2) {
                    inferredFont = "Condensed Font (Tight Line Height)"
                  } else {
                    // Try to match with configured fonts based on text properties
                    const configuredFonts = instance.config.text.fonts
                    if (configuredFonts && configuredFonts.length > 0) {
                      let matchedFont = configuredFonts.find((font) => {
                        // Simple heuristic: if fontSize matches common weights
                        if (fontSize && fontSize > 20) return font.fontWeight >= 600
                        return font.fontWeight === 400 // default to regular
                      })

                      if (!matchedFont) matchedFont = configuredFonts[0] // fallback to first
                      inferredFont = `${matchedFont.fontFamily} (Inferred)`
                    } else {
                      inferredFont = `System Font - ${name} (PSD Import)`
                    }
                  }

                  properties.fontName = inferredFont
                  properties.fontInferred = true
                  console.log(`[v0] INFERRED - font name: ${properties.fontName}`)
                } catch (e4) {
                  console.log(`[v0] FAILED - font inference: ${e4.message}`)
                  properties.fontName = `Unknown Font - ${name}`
                }
              }
            }

            // Extract text colors for the entire text
            try {
              if (textLength > 0) {
                properties.textColors = instance.block.getTextColors(blockId, 0, textLength)
                console.log(`[v0] SUCCESS - textColors:`, properties.textColors)
              }
            } catch (e) {
              console.log(`[v0] FAILED - textColors: ${e.message}`)
              logToFile(`[ExtractData] Erro ao extrair textColors para ${name}: ${e.message}`)
            }

            // Extract font weights for the entire text
            try {
              if (textLength > 0) {
                properties.fontWeights = instance.block.getTextFontWeights(blockId, 0, textLength)
                console.log(`[v0] SUCCESS - fontWeights:`, properties.fontWeights)
              }
            } catch (e) {
              console.log(`[v0] FAILED - fontWeights: ${e.message}`)
              logToFile(`[ExtractData] Erro ao extrair fontWeights para ${name}: ${e.message}`)
            }

            // Extract font sizes for the entire text
            try {
              if (textLength > 0) {
                properties.fontSizes = instance.block.getTextFontSizes(blockId, 0, textLength)
                console.log(`[v0] SUCCESS - fontSizes:`, properties.fontSizes)
              }
            } catch (e) {
              console.log(`[v0] FAILED - fontSizes: ${e.message}`)
              logToFile(`[ExtractData] Erro ao extrair fontSizes para ${name}: ${e.message}`)
            }

            // Extract font styles for the entire text
            try {
              if (textLength > 0) {
                properties.fontStyles = instance.block.getTextFontStyles(blockId, 0, textLength)
                console.log(`[v0] SUCCESS - fontStyles:`, properties.fontStyles)
              }
            } catch (e) {
              console.log(`[v0] FAILED - fontStyles: ${e.message}`)
              logToFile(`[ExtractData] Erro ao extrair fontStyles para ${name}: ${e.message}`)
            }

            // Extract text cases for the entire text
            try {
              if (textLength > 0) {
                properties.textCases = instance.block.getTextCases(blockId, 0, textLength)
                console.log(`[v0] SUCCESS - textCases:`, properties.textCases)
              }
            } catch (e) {
              console.log(`[v0] FAILED - textCases: ${e.message}`)
              logToFile(`[ExtractData] Erro ao extrair textCases para ${name}: ${e.message}`)
            }

            // Extract text cursor range
            try {
              properties.selectedRange = instance.block.getTextCursorRange(blockId)
              console.log(`[v0] SUCCESS - selectedRange:`, properties.selectedRange)
            } catch (e) {
              try {
                properties.selectedRange = instance.block.getTextCursorRange()
                console.log(`[v0] SUCCESS - selectedRange (no param):`, properties.selectedRange)
              } catch (e2) {
                console.log(`[v0] FAILED - selectedRange: ${e2.message}`)
                logToFile(`[ExtractData] Erro ao extrair selectedRange para ${name}: ${e2.message}`)
              }
            }

            // Extract line count and line properties
            try {
              properties.lineCount = instance.block.getTextVisibleLineCount(blockId)
              console.log(`[v0] SUCCESS - lineCount:`, properties.lineCount)

              // Extract line content and bounding boxes for each visible line
              if (properties.lineCount > 0) {
                properties.lines = []
                for (let lineIndex = 0; lineIndex < properties.lineCount; lineIndex++) {
                  try {
                    const lineContent = instance.block.getTextVisibleLineContent(blockId, lineIndex)
                    const lineBoundingBox = instance.block.getTextVisibleLineGlobalBoundingBoxXYWH(blockId, lineIndex)

                    properties.lines.push({
                      index: lineIndex,
                      content: lineContent,
                      boundingBox: lineBoundingBox,
                    })
                    console.log(`[v0] SUCCESS - line ${lineIndex}:`, {
                      content: lineContent,
                      boundingBox: lineBoundingBox,
                    })
                  } catch (e) {
                    console.log(`[v0] FAILED - line ${lineIndex}: ${e.message}`)
                    logToFile(`[ExtractData] Erro ao extrair linha ${lineIndex} para ${name}: ${e.message}`)
                  }
                }
              }
            } catch (e) {
              console.log(`[v0] FAILED - lineCount: ${e.message}`)
              logToFile(`[ExtractData] Erro ao extrair lineCount para ${name}: ${e.message}`)
            }

            // Extract colors in specific range (characters 2 to 5) - only if text is long enough
            try {
              if (textLength >= 6) {
                properties.colorsInRange = instance.block.getTextColors(blockId, 2, 5)
                console.log(`[v0] SUCCESS - colorsInRange (2-5):`, properties.colorsInRange)
              } else {
                console.log(`[v0] SKIPPED - colorsInRange: text too short (${textLength} chars)`)
              }
            } catch (e) {
              console.log(`[v0] FAILED - colorsInRange: ${e.message}`)
              logToFile(`[ExtractData] Erro ao extrair colorsInRange para ${name}: ${e.message}`)
            }

            // Extract font weights in specific range (characters 0 to 6) - only if text is long enough
            try {
              if (textLength >= 7) {
                properties.fontWeightsInRange = instance.block.getTextFontWeights(blockId, 0, 6)
                console.log(`[v0] SUCCESS - fontWeightsInRange (0-6):`, properties.fontWeightsInRange)
              } else {
                console.log(`[v0] SKIPPED - fontWeightsInRange: text too short (${textLength} chars)`)
              }
            } catch (e) {
              console.log(`[v0] FAILED - fontWeightsInRange: ${e.message}`)
              logToFile(`[ExtractData] Erro ao extrair fontWeightsInRange para ${name}: ${e.message}`)
            }

            console.log(`[v0] COMPLETED text properties extraction for: ${name}`)
          } catch (e) {
            console.log(`[v0] MAJOR ERROR in text properties extraction for ${name}: ${e.message}`)
            logToFile(
              `[ExtractData] Erro geral ao extrair propriedades específicas de texto para ${name}: ${e.message}`,
            )
          }
        }

        // Extrair propriedades do fill (preenchimento), se houver
        try {
          const fillId = instance.block.getFill(blockId)
          if (fillId) {
            properties.fill = {}
            const fillProperties = instance.block.findAllProperties(fillId)
            for (const fillPropPath of fillProperties) {
              try {
                let fillValue
                if (fillPropPath.includes("color")) {
                  fillValue = instance.block.getColor(fillId, fillPropPath)
                } else if (fillPropPath.includes("uri") || fillPropPath.includes("type")) {
                  fillValue = instance.block.getString(fillId, fillPropPath)
                } else {
                  try {
                    fillValue = instance.block.getString(fillId, fillPropPath)
                  } catch (e) {
                    try {
                      fillValue = instance.block.getBool(fillId, fillPropPath)
                    } catch (e) {
                      try {
                        fillValue = instance.block.getFloat(fillId, fillPropPath)
                      } catch (e) {
                        logToFile(
                          `[ExtractData] Não foi possível extrair fill propriedade ${fillPropPath} para ${name}: ${e.message}`,
                        )
                        continue
                      }
                    }
                  }
                }
                properties.fill[fillPropPath] = fillValue
              } catch (e) {
                logToFile(`[ExtractData] Erro ao extrair fill propriedade ${fillPropPath} para ${name}: ${e.message}`)
              }
            }
          }
        } catch (e) {
          logToFile(`[ExtractData] Não foi possível extrair fill para ${name}: ${e.message}`)
        }

        extractedData[name] = properties
      }
    }

    const outputFilePath = "dados_psd_original.txt"
    fs.writeFileSync(outputFilePath, JSON.stringify(extractedData, null, 2))
    logToFile(`Dados do PSD extraídos e salvos em: ${outputFilePath}`)

    res.json({ success: true, message: `Dados do PSD extraídos e salvos em ${outputFilePath}`, data: extractedData })
  } catch (error) {
    console.log(`[DEBUG] Tentando logar erro de extract-psd-data...`)
    logToFile(
      `Erro ao extrair dados do PSD: ${error?.message || error}\nNome do Erro: ${error?.name}\nErro Completo: ${error?.toString()}\nStack: ${error?.stack}`,
    )
    console.log(`[DEBUG] Erro de extract-psd-data logado.`)
    res.status(500).json({ success: false, message: "Erro ao extrair dados do PSD", error: error?.message || error })
  } finally {
    if (instance) {
      instance.dispose()
    }
  }
})