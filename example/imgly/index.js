const CESDK = require("@cesdk/node")

const fs = require("fs")
const path = require("path")
const express = require("express")
const { PSDParser, createPNGJSEncodeBufferToPNG } = require("@imgly/psd-importer") // Importa PSDParser e o encoder
const { PNG } = require("pngjs") // Importa o módulo PNG do pngjs
const { spawn } = require("child_process") // Para executar o script Python
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

// Função para executar o script Python de extração binária (método funcionando)
async function extractFontsWithBinaryAnalysis(psdPath) {
  return new Promise((resolve, reject) => {
    const pythonScript = spawn('python', ['scan_fonts_binary.py', psdPath, '--json'])
    
    let stdout = ''
    let stderr = ''
    
    pythonScript.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonScript.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    pythonScript.on('close', (code) => {
      if (code !== 0) {
        logToFile(`[BinaryExtraction] Python script failed with code ${code}: ${stderr}`)
        reject(new Error(`Python script failed: ${stderr}`))
        return
      }
      
      try {
        // Parse do JSON retornado pelo script
        const result = JSON.parse(stdout)
        const fontsFound = result.fonts || []
        
        const binaryResults = {
          source_file: psdPath,
          extraction_method: 'scan_fonts_binary',
          fonts_found: fontsFound,
          total_fonts: fontsFound.length,
          raw_output: result
        }
        
        logToFile(`[BinaryExtraction] Successfully extracted ${fontsFound.length} fonts: ${fontsFound.join(', ')}`)
        resolve(binaryResults)
        
      } catch (error) {
        logToFile(`[BinaryExtraction] Error parsing JSON: ${error.message}`)
        logToFile(`[BinaryExtraction] Raw stdout: ${stdout}`)
        reject(error)
      }
    })
    
    pythonScript.on('error', (error) => {
      logToFile(`[BinaryExtraction] Failed to start Python script: ${error.message}`)
      reject(error)
    })
  })
}

// Função para extrair fontes com associação inteligente por camada
async function extractFontsPerLayer(psdPath) {
  return new Promise((resolve, reject) => {
    const pythonScript = spawn('python', ['extract_fonts_smart.py', psdPath])
    
    let stdout = ''
    let stderr = ''
    
    pythonScript.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonScript.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    pythonScript.on('close', (code) => {
      if (code !== 0) {
        logToFile(`[SmartExtraction] Python script failed with code ${code}: ${stderr}`)
        reject(new Error(`Python script failed: ${stderr}`))
        return
      }
      
      try {
        // O script imprime várias linhas, a última é o JSON
        const lines = stdout.trim().split('\n')
        const jsonLine = lines[lines.length - 1]
        
        const result = JSON.parse(jsonLine)
        
        logToFile(`[SmartExtraction] Successfully processed ${result.summary.total_text_layers} layers`)
        logToFile(`[SmartExtraction] Total fonts: ${result.summary.total_fonts}`)
        logToFile(`[SmartExtraction] Fonts: ${result.summary.all_fonts_found.join(', ')}`)
        logToFile(`[SmartExtraction] Associations: ${result.summary.association_success}/${result.summary.total_text_layers}`)
        
        resolve(result)
        
      } catch (error) {
        logToFile(`[SmartExtraction] Error parsing JSON: ${error.message}`)
        logToFile(`[SmartExtraction] Raw stdout: ${stdout}`)
        reject(error)
      }
    })
    
    pythonScript.on('error', (error) => {
      logToFile(`[SmartExtraction] Failed to start Python script: ${error.message}`)
      reject(error)
    })
  })
}


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
        // TESTE: Não pular mais nenhum bloco
        logToFile(`[ApplyData] 🔧 Processando bloco: ${key}`)
        
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

    logToFile(`[ApplyData] 🏁 Finalizando aplicação de dados, iniciando exportação...`)
    
    // Verifica se há blocos com erro antes da exportação
    const textBlocks = instance.block.findByType("//ly.img.ubq/text")
    for (const textBlock of textBlocks) {
      const blockName = instance.block.getName(textBlock)
      try {
        const blockVisible = instance.block.isVisible(textBlock)
        const blockType = instance.block.getType(textBlock)
        logToFile(`[PreExport] Bloco ${blockName} (${textBlock}): tipo=${blockType}, visível=${blockVisible}`)
        
        // Test if we can get basic properties without error
        const textContent = instance.block.getString(textBlock, "text/text")
        logToFile(`[PreExport] Texto do bloco ${blockName}: "${textContent}"`)
        
      } catch (blockError) {
        logToFile(`[PreExport] ⚠️ Erro ao verificar bloco ${blockName}: ${blockError.message}`)
      }
    }
    
    // Encontra o bloco da página principal para exportar
    const pageBlock = instance.block.findByType("page")[0]
    if (!pageBlock) {
      throw new Error("Nenhum bloco de página encontrado na cena.")
    }

    logToFile(`[Export] 📤 Iniciando exportação da página ${pageBlock}`)
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

// Rota para gerar imagens usando o método de assets de fonte (CORRETO para v1.57.0)
app.post("/generate-images-batch-smart", async (req, res) => {
  const { psdPath, items, outputPathBase } = req.body;

  if (!psdPath || !items || !Array.isArray(items) || !outputPathBase) {
    return res
      .status(400)
      .json({ success: false, message: "Parâmetros psdPath, items (array) e outputPathBase são obrigatórios." });
  }

  let instance = null;
  const results = [];

  try {
    // 1. Inicializa o CE.SDK
    instance = await CESDK.init({
      license: "GoLCfXI3NJKzx27wMBOCHQSdQEj6Z5lpzq7ubQGrk6u-e6ymEsPzZ4tso5Dxe4vx",
      headless: true,
    });

    // Mock para ly.img.google-fonts para evitar erros de rede
    instance.asset.addLocalSource("ly.img.google-fonts", {
      type: "ly.img.asset.typeface",
      payload: {
        typefaces: [],
      },
    });

    // 2. Agrupa e registra todas as fontes disponíveis
    const fontsDir = path.resolve(__dirname, 'fonts');
    const fontFiles = fs.readdirSync(fontsDir);
    const fontFamilies = {}; // Objeto para agrupar fontes por família

    // Agrupa arquivos de fonte pela família (lógica v2, mais robusta)
    for (const fontFile of fontFiles) {
      if (fontFile.match(/\.(ttf|otf|woff|woff2)$/i)) {
        const baseName = path.basename(fontFile, path.extname(fontFile));
        
        const styleKeywords = ['Bold', 'Light', 'Regular', 'Thin', 'Black', 'Italic', 'Medium', 'Condensed'];
        let familyName = baseName;

        for (const keyword of styleKeywords) {
            const regex = new RegExp(`(-|_|\\s)?${keyword}const CESDK = require("@cesdk/node")

const fs = require("fs")
const path = require("path")
const express = require("express")
const { PSDParser, createPNGJSEncodeBufferToPNG } = require("@imgly/psd-importer") // Importa PSDParser e o encoder
const { PNG } = require("pngjs") // Importa o módulo PNG do pngjs
const { spawn } = require("child_process") // Para executar o script Python
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

// Função para executar o script Python de extração binária (método funcionando)
async function extractFontsWithBinaryAnalysis(psdPath) {
  return new Promise((resolve, reject) => {
    const pythonScript = spawn('python', ['scan_fonts_binary.py', psdPath, '--json'])
    
    let stdout = ''
    let stderr = ''
    
    pythonScript.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonScript.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    pythonScript.on('close', (code) => {
      if (code !== 0) {
        logToFile(`[BinaryExtraction] Python script failed with code ${code}: ${stderr}`)
        reject(new Error(`Python script failed: ${stderr}`))
        return
      }
      
      try {
        // Parse do JSON retornado pelo script
        const result = JSON.parse(stdout)
        const fontsFound = result.fonts || []
        
        const binaryResults = {
          source_file: psdPath,
          extraction_method: 'scan_fonts_binary',
          fonts_found: fontsFound,
          total_fonts: fontsFound.length,
          raw_output: result
        }
        
        logToFile(`[BinaryExtraction] Successfully extracted ${fontsFound.length} fonts: ${fontsFound.join(', ')}`)
        resolve(binaryResults)
        
      } catch (error) {
        logToFile(`[BinaryExtraction] Error parsing JSON: ${error.message}`)
        logToFile(`[BinaryExtraction] Raw stdout: ${stdout}`)
        reject(error)
      }
    })
    
    pythonScript.on('error', (error) => {
      logToFile(`[BinaryExtraction] Failed to start Python script: ${error.message}`)
      reject(error)
    })
  })
}

// Função para extrair fontes com associação inteligente por camada
async function extractFontsPerLayer(psdPath) {
  return new Promise((resolve, reject) => {
    const pythonScript = spawn('python', ['extract_fonts_smart.py', psdPath])
    
    let stdout = ''
    let stderr = ''
    
    pythonScript.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonScript.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    pythonScript.on('close', (code) => {
      if (code !== 0) {
        logToFile(`[SmartExtraction] Python script failed with code ${code}: ${stderr}`)
        reject(new Error(`Python script failed: ${stderr}`))
        return
      }
      
      try {
        // O script imprime várias linhas, a última é o JSON
        const lines = stdout.trim().split('\n')
        const jsonLine = lines[lines.length - 1]
        
        const result = JSON.parse(jsonLine)
        
        logToFile(`[SmartExtraction] Successfully processed ${result.summary.total_text_layers} layers`)
        logToFile(`[SmartExtraction] Total fonts: ${result.summary.total_fonts}`)
        logToFile(`[SmartExtraction] Fonts: ${result.summary.all_fonts_found.join(', ')}`)
        logToFile(`[SmartExtraction] Associations: ${result.summary.association_success}/${result.summary.total_text_layers}`)
        
        resolve(result)
        
      } catch (error) {
        logToFile(`[SmartExtraction] Error parsing JSON: ${error.message}`)
        logToFile(`[SmartExtraction] Raw stdout: ${stdout}`)
        reject(error)
      }
    })
    
    pythonScript.on('error', (error) => {
      logToFile(`[SmartExtraction] Failed to start Python script: ${error.message}`)
      reject(error)
    })
  })
}


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
        // TESTE: Não pular mais nenhum bloco
        logToFile(`[ApplyData] 🔧 Processando bloco: ${key}`)
        
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

    logToFile(`[ApplyData] 🏁 Finalizando aplicação de dados, iniciando exportação...`)
    
    // Verifica se há blocos com erro antes da exportação
    const textBlocks = instance.block.findByType("//ly.img.ubq/text")
    for (const textBlock of textBlocks) {
      const blockName = instance.block.getName(textBlock)
      try {
        const blockVisible = instance.block.isVisible(textBlock)
        const blockType = instance.block.getType(textBlock)
        logToFile(`[PreExport] Bloco ${blockName} (${textBlock}): tipo=${blockType}, visível=${blockVisible}`)
        
        // Test if we can get basic properties without error
        const textContent = instance.block.getString(textBlock, "text/text")
        logToFile(`[PreExport] Texto do bloco ${blockName}: "${textContent}"`)
        
      } catch (blockError) {
        logToFile(`[PreExport] ⚠️ Erro ao verificar bloco ${blockName}: ${blockError.message}`)
      }
    }
    
    // Encontra o bloco da página principal para exportar
    const pageBlock = instance.block.findByType("page")[0]
    if (!pageBlock) {
      throw new Error("Nenhum bloco de página encontrado na cena.")
    }

    logToFile(`[Export] 📤 Iniciando exportação da página ${pageBlock}`)
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

// Rota para gerar imagens usando o método de assets de fonte (CORRETO para v1.57.0)
app.post("/generate-images-batch-smart", async (req, res) => {
  const { psdPath, items, outputPathBase } = req.body;

  if (!psdPath || !items || !Array.isArray(items) || !outputPathBase) {
    return res
      .status(400)
      .json({ success: false, message: "Parâmetros psdPath, items (array) e outputPathBase são obrigatórios." });
  }

  let instance = null;
  const results = [];

  try {
    // 1. Inicializa o CE.SDK
    instance = await CESDK.init({
      license: "GoLCfXI3NJKzx27wMBOCHQSdQEj6Z5lpzq7ubQGrk6u-e6ymEsPzZ4tso5Dxe4vx",
      headless: true,
    });

    // Mock para ly.img.google-fonts para evitar erros de rede
    instance.asset.addLocalSource("ly.img.google-fonts", {
      type: "ly.img.asset.typeface",
      payload: {
        typefaces: [],
      },
    });

    // 2. Agrupa e registra todas as fontes disponíveis
    const fontsDir = path.resolve(__dirname, 'fonts');
    const fontFiles = fs.readdirSync(fontsDir);
    const fontFamilies = {}; // Objeto para agrupar fontes por família

    , 'i');
            familyName = familyName.replace(regex, '');
        }
        familyName = familyName.trim();

        // Normalização manual para casos específicos
        if (familyName.toLowerCase().startsWith('avianos')) {
            familyName = 'Aviano Sans';
        }

        if (!fontFamilies[familyName]) {
          fontFamilies[familyName] = [];
        }
        fontFamilies[familyName].push({ file: fontFile, name: baseName });
      }
    }

    // Registra cada família de fontes como um asset
    const sourceId = 'custom-fonts';
    instance.asset.addLocalSource(sourceId);

    for (const familyName in fontFamilies) {
      const typefacePayload = {
        name: familyName,
        fonts: fontFamilies[familyName].map(fontInfo => {
          let weight = 'normal';
          let subFamily = 'Regular';
          const styleMatch = fontInfo.name.substring(familyName.length).trim();

          if (styleMatch) {
            subFamily = styleMatch;
          }

          if (/bold/i.test(styleMatch)) weight = 'bold';
          else if (/light/i.test(styleMatch)) weight = 'light';
          else if (/thin/i.test(styleMatch)) weight = 'thin';
          else if (/black/i.test(styleMatch)) weight = 'black';
          else if (/regular/i.test(styleMatch)) weight = 'normal';

          return {
            uri: path.resolve(fontsDir, fontInfo.file),
            subFamily: subFamily,
            weight: weight,
            style: /italic/i.test(styleMatch) ? 'italic' : 'normal'
          };
        })
      };

      await instance.asset.addAssetToSource(sourceId, { 
        id: `typeface-${familyName.toLowerCase().replace(/\s+/g, '-')}`,
        payload: { typeface: typefacePayload }
      });
      logToFile(`[FontAsset] Família de fontes registrada: ${familyName}`);
    }

    // 3. Processa cada item da requisição
    for (let i = 0; i < items.length; i++) {
      const itemData = items[i].data;
      const uniqueOutputPath = `${outputPathBase}${i}.png`;
      logToFile(`[BatchSmart] Processando item ${i + 1}/${items.length}`);
      
      const itemResult = await generateSingleImage(instance, psdPath, itemData, uniqueOutputPath);
      results.push({ 
        index: i, 
        outputPath: uniqueOutputPath, 
        ...itemResult 
      });
    }

    res.json({ success: true, results });

  } catch (error) {
    logToFile(`[BatchSmart] Erro no processamento: ${error.message}\nStack: ${error.stack}`);
    res.status(500).json({ success: false, message: "Erro no processamento inteligente", error: error.message });
  } finally {
    if (instance) {
      instance.dispose();
    }
  }
});

// Função auxiliar para aplicar mapeamento de fontes aos dados
function applyFontMapping(itemData, fontMapping, fontResults) {
  const mappedData = JSON.parse(JSON.stringify(itemData)); // Deep copy
  logToFile(`[FontMapping] ===== APLICANDO MAPEAMENTO DE FONTES (v2) =====`);
  logToFile(`[FontMapping] Dados originais: ${JSON.stringify(itemData, null, 2)}`);

  // Iterate over all layers in the incoming data
  for (const [layerName, layerProps] of Object.entries(mappedData)) {
    if (layerProps && typeof layerProps === 'object' && layerProps['text/typeface']) {
      const currentTypeface = layerProps['text/typeface']; // e.g., 'aviano-sans-bold'

      // This is the master mapping that converts a friendly name (like 'aviano-sans-bold')
      // into the internal key used by the font system (like 'AvianoSansBold').
      const typefaceNameMap = {
        'aviano-sans-light': 'AvianoSansLight',
        'aviano-sans-thin': 'AvianoSansThin',
        'aviano-sans-bold': 'AvianoSansBold',
        'aviano-sans-black': 'AvianoSansBlack'
      };

      const internalFontKey = typefaceNameMap[currentTypeface]; // e.g., 'AvianoSansBold'

      if (internalFontKey) {
        // Check if this font key exists in our master font map (created from the /fonts dir)
        if (fontMapping[internalFontKey]) {
          const finalFontIdentifier = fontMapping[internalFontKey].identifier;
          
          // This is the ONLY property that should be set.
          // The customFontResolver will use this identifier to find the font file.
          layerProps['text/typeface'] = finalFontIdentifier;
          
          logToFile(`[FontMapping] ✅ ${layerName}: Mapeado '${currentTypeface}' -> '${finalFontIdentifier}'`);
        } else {
          logToFile(`[FontMapping] ⚠️ Aviso: A fonte '${currentTypeface}' (mapeada para '${internalFontKey}') não foi encontrada nos arquivos locais.`);
          // Keep the original typeface, let the resolver try to handle it.
          layerProps['text/typeface'] = currentTypeface;
        }
      } else {
        logToFile(`[FontMapping] ℹ️ Info: Nenhuma regra de mapeamento para o typeface '${currentTypeface}' na camada ${layerName}. Usando valor original.`);
      }
    }
  }

  logToFile(`[FontMapping] 📋 Dados finais mapeados: ${JSON.stringify(mappedData, null, 2)}`);
  logToFile(`[FontMapping] ===== MAPEAMENTO CONCLUÍDO (v2) =====`);
  return mappedData;
}

// Rota POST original para gerar múltiplas imagens
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
            fontURI: "file:///fonts/BebasNeue Bold.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-book",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///fonts/BebasNeue Book.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-light",
            fontFamily: "Bebas Neue",
            fontWeight: 300,
            fontURI: "file:///fonts/BebasNeue Light.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-regular",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///fonts/BebasNeue Regular.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-thin",
            fontFamily: "Bebas Neue",
            fontWeight: 100,
            fontURI: "file:///fonts/BebasNeue Thin.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "arial-regular",
            fontFamily: "Arial",
            fontWeight: 400,
            fontURI: "file:///fonts/Arial.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "arial-bold",
            fontFamily: "Arial",
            fontWeight: 700,
            fontURI: "file:///fonts/Arial Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "times-new-roman-regular",
            fontFamily: "Times New Roman",
            fontWeight: 400,
            fontURI: "file:///fonts/Times New Roman.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "times-new-roman-bold",
            fontFamily: "Times New Roman",
            fontWeight: 700,
            fontURI: "file:///fonts/Times New Roman Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-24pt-regular",
            fontFamily: "Inter",
            fontWeight: 400,
            fontURI: "file:///fonts/Inter_24pt-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-24pt-light",
            fontFamily: "Inter", 
            fontWeight: 300,
            fontURI: "file:///fonts/Inter_24pt-Light.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-24pt-bold",
            fontFamily: "Inter",
            fontWeight: 700,
            fontURI: "file:///fonts/Inter_24pt-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-28pt",
            fontFamily: "Inter",
            fontWeight: 400,
            fontURI: "file:///fonts/Inter 28pt.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-28pt-bold",
            fontFamily: "Inter",
            fontWeight: 700,
            fontURI: "file:///fonts/Inter_28pt-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "montserrat-regular",
            fontFamily: "Montserrat",
            fontWeight: 400,
            fontURI: "file:///fonts/Montserrat-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "montserrat-light",
            fontFamily: "Montserrat",
            fontWeight: 300,
            fontURI: "file:///fonts/Montserrat-Light.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "montserrat-bold",
            fontFamily: "Montserrat",
            fontWeight: 700,
            fontURI: "file:///fonts/Montserrat-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "calibri-regular",
            fontFamily: "Calibri",
            fontWeight: 400,
            fontURI: "file:///fonts/Calibri.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "calibri-bold",
            fontFamily: "Calibri",
            fontWeight: 700,
            fontURI: "file:///fonts/Calibri Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "segoe-ui-regular",
            fontFamily: "Segoe UI",
            fontWeight: 400,
            fontURI: "file:///fonts/Segoe UI.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "segoe-ui-bold",
            fontFamily: "Segoe UI",
            fontWeight: 700,
            fontURI: "file:///fonts/Segoe UI Bold.ttf",
            format: "ttf",
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
            fontURI: "file:///fonts/BebasNeue Bold.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-book",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///fonts/BebasNeue Book.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-light",
            fontFamily: "Bebas Neue",
            fontWeight: 300,
            fontURI: "file:///fonts/BebasNeue Light.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-regular",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///fonts/BebasNeue Regular.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-thin",
            fontFamily: "Bebas Neue",
            fontWeight: 100,
            fontURI: "file:///fonts/BebasNeue Thin.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "arial-regular",
            fontFamily: "Arial",
            fontWeight: 400,
            fontURI: "file:///fonts/Arial.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "arial-bold",
            fontFamily: "Arial",
            fontWeight: 700,
            fontURI: "file:///fonts/Arial Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "times-new-roman-regular",
            fontFamily: "Times New Roman",
            fontWeight: 400,
            fontURI: "file:///fonts/Times New Roman.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "times-new-roman-bold",
            fontFamily: "Times New Roman",
            fontWeight: 700,
            fontURI: "file:///fonts/Times New Roman Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-24pt-regular",
            fontFamily: "Inter",
            fontWeight: 400,
            fontURI: "file:///fonts/Inter_24pt-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-24pt-light",
            fontFamily: "Inter", 
            fontWeight: 300,
            fontURI: "file:///fonts/Inter_24pt-Light.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-24pt-bold",
            fontFamily: "Inter",
            fontWeight: 700,
            fontURI: "file:///fonts/Inter_24pt-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-28pt",
            fontFamily: "Inter",
            fontWeight: 400,
            fontURI: "file:///fonts/Inter 28pt.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "inter-28pt-bold",
            fontFamily: "Inter",
            fontWeight: 700,
            fontURI: "file:///fonts/Inter_28pt-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "montserrat-regular",
            fontFamily: "Montserrat",
            fontWeight: 400,
            fontURI: "file:///fonts/Montserrat-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "montserrat-light",
            fontFamily: "Montserrat",
            fontWeight: 300,
            fontURI: "file:///fonts/Montserrat-Light.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "montserrat-bold",
            fontFamily: "Montserrat",
            fontWeight: 700,
            fontURI: "file:///fonts/Montserrat-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "calibri-regular",
            fontFamily: "Calibri",
            fontWeight: 400,
            fontURI: "file:///fonts/Calibri.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "calibri-bold",
            fontFamily: "Calibri",
            fontWeight: 700,
            fontURI: "file:///fonts/Calibri Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "segoe-ui-regular",
            fontFamily: "Segoe UI",
            fontWeight: 400,
            fontURI: "file:///fonts/Segoe UI.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "segoe-ui-bold",
            fontFamily: "Segoe UI",
            fontWeight: 700,
            fontURI: "file:///fonts/Segoe UI Bold.ttf",
            format: "ttf",
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
              // String properties - expanded font properties
              propPath.includes("text/text") ||
              propPath.includes("text/typeface") ||
              propPath.includes("text/fontFamily") ||
              propPath.includes("text/fontName") ||
              propPath.includes("text/postScriptName") ||
              propPath.includes("text/displayName") ||
              propPath.includes("text/familyName") ||
              propPath.includes("text/styleName") ||
              propPath === "text/fontFileUri" ||
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
              const typeface = instance.block.getTypeface(blockId)
              properties.defaultTypeface = typeface
              console.log(`[v0] SUCCESS - defaultTypeface:`, JSON.stringify(typeface, null, 2))
              console.log(`[v0] Typeface type:`, typeof typeface)
              console.log(`[v0] Typeface keys:`, typeface ? Object.keys(typeface) : "null/undefined")

              if (typeface && typeof typeface === "object") {
                // Try to get name from typeface object
                if (typeface.name) {
                  properties.fontName = typeface.name
                  fontNameExtracted = true
                  console.log(`[v0] SUCCESS - extracted font name from typeface.name: ${properties.fontName}`)
                } else if (typeface.id) {
                  properties.fontName = typeface.id
                  fontNameExtracted = true
                  console.log(`[v0] SUCCESS - extracted font name from typeface.id: ${properties.fontName}`)
                } else {
                  console.log(`[v0] WARNING - typeface object has no name or id property`)
                  console.log(`[v0] Full typeface object:`, JSON.stringify(typeface, null, 2))
                  properties.fontName = `Unknown Font (${JSON.stringify(typeface)})`
                  fontNameExtracted = true
                }
              }
            } catch (e) {
              console.log(`[v0] FAILED - defaultTypeface: ${e.message}`)

              if (e.message.includes("unknown typeface") || e.message.includes("block has no typeface")) {
                console.log(`[v0] SKIPPING - Block has no/unknown typeface, will try alternative methods`)
              } else {
                logToFile(`[ExtractData] Erro ao extrair defaultTypeface para ${name}: ${e.message}`)
              }

              // Method 2: Try getTypefaces() with range
              try {
                let typefaces
                if (textLength > 0) {
                  typefaces = instance.block.getTypefaces(blockId, 0, textLength)
                  console.log(`[v0] SUCCESS - typefaces (with range):`, JSON.stringify(typefaces, null, 2))
                } else {
                  typefaces = instance.block.getTypefaces(blockId)
                  console.log(`[v0] SUCCESS - typefaces (no range):`, JSON.stringify(typefaces, null, 2))
                }

                console.log(`[v0] Typefaces array length:`, typefaces ? typefaces.length : "null/undefined")
                console.log(`[v0] Typefaces type:`, typeof typefaces)

                if (typefaces && Array.isArray(typefaces) && typefaces.length > 0) {
                  properties.typefaces = typefaces
                  properties.fontFamilies = typefaces.map((tf) => {
                    if (tf && typeof tf === "object") {
                      return tf.name || tf.id || JSON.stringify(tf)
                    }
                    return String(tf)
                  })

                  // Use first typeface as default
                  const firstTypeface = typefaces[0]
                  console.log(`[v0] First typeface:`, JSON.stringify(firstTypeface, null, 2))
                  console.log(
                    `[v0] First typeface keys:`,
                    firstTypeface ? Object.keys(firstTypeface) : "null/undefined",
                  )

                  if (firstTypeface && typeof firstTypeface === "object") {
                    properties.defaultTypeface = firstTypeface
                    properties.fontName =
                      firstTypeface.name || firstTypeface.id || `Typeface: ${JSON.stringify(firstTypeface)}`
                    fontNameExtracted = true
                    console.log(`[v0] SUCCESS - extracted font name from typefaces[0]: ${properties.fontName}`)
                  }
                }
              } catch (e2) {
                console.log(`[v0] FAILED - typefaces: ${e2.message}`)
                if (e2.message.includes("unknown typeface") || e2.message.includes("block has no typeface")) {
                  console.log(`[v0] SKIPPING - getTypefaces also failed with no/unknown typeface`)
                } else {
                  logToFile(`[ExtractData] Erro ao extrair typefaces para ${name}: ${e2.message}`)
                }
              }
            }

            if (!fontNameExtracted) {
              const fontProperties = [
                "text/fontFamily",
                "text/fontName",
                "text/postScriptName",
                "text/displayName",
                "text/familyName",
                "text/styleName",
              ]

              console.log(`[v0] CHECKING font properties for block: ${name}`)
              for (const fontProp of fontProperties) {
                const propValue = properties[fontProp]
                console.log(`[v0] ${fontProp}: "${propValue}" (type: ${typeof propValue})`)

                if (propValue && propValue !== "") {
                  properties.fontName = propValue
                  fontNameExtracted = true
                  console.log(`[v0] SUCCESS - font name from ${fontProp}: ${properties.fontName}`)
                  break
                }
              }

              console.log(
                `[v0] text/typeface: "${properties["text/typeface"]}" (type: ${typeof properties["text/typeface"]})`,
              )

              // Method 3: Try to extract font name from text/typeface property
              if (!fontNameExtracted && properties["text/typeface"] && properties["text/typeface"] !== "") {
                properties.fontName = properties["text/typeface"]
                fontNameExtracted = true
                console.log(`[v0] SUCCESS - font name from text/typeface property: ${properties.fontName}`)
              }

              console.log(
                `[v0] text/fontFileUri: "${properties["text/fontFileUri"]}" (type: ${typeof properties["text/fontFileUri"]})`,
              )

              // Method 4: Try to extract from text/fontFileUri
              if (!fontNameExtracted && properties["text/fontFileUri"] && properties["text/fontFileUri"] !== "") {
                try {
                  const fontFileUri = properties["text/fontFileUri"]
                  // Extract font name from file path
                  const fontFileName = fontFileUri.split("/").pop().split("\\").pop()
                  properties.fontName = fontFileName.replace(/\.(ttf|otf|woff|woff2)$/i, "")
                  fontNameExtracted = true
                  console.log(`[v0] SUCCESS - font name from fontFileUri: ${properties.fontName}`)
                } catch (e3) {
                  console.log(`[v0] FAILED - fontFileUri extraction: ${e3.message}`)
                }
              }

              if (!fontNameExtracted) {
                properties.fontName = ""
                console.log(`[v0] FALLBACK - font name left empty (no font info available)`)
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


// Rota POST para extrair dados de um arquivo PSD
app.post("/extract-psd-data", async (req, res) => {
  const { psdPath } = req.body

  if (!psdPath) {
    return res.status(400).json({ success: false, message: "O parâmetro psdPath é obrigatório." })
  }

  let instance = null
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
            fontURI: "file:///fonts/BebasNeue Bold.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-book",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///fonts/BebasNeue Book.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-light",
            fontFamily: "Bebas Neue",
            fontWeight: 300,
            fontURI: "file:///fonts/BebasNeue Light.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-regular",
            fontFamily: "Bebas Neue",
            fontWeight: 400,
            fontURI: "file:///fonts/BebasNeue Regular.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "bebas-neue-thin",
            fontFamily: "Bebas Neue",
            fontWeight: 100,
            fontURI: "file:///fonts/BebasNeue Thin.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "arial-regular",
            fontFamily: "Arial",
            fontWeight: 400,
            fontURI: "file:///fonts/Arial.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "arial-bold",
            fontFamily: "Arial",
            fontWeight: 700,
            fontURI: "file:///fonts/Arial Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "times-new-roman-regular",
            fontFamily: "Times New Roman",
            fontWeight: 400,
            fontURI: "file:///fonts/Times New Roman.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "times-new-roman-bold",
            fontFamily: "Times New Roman",
            fontWeight: 700,
            fontURI: "file:///fonts/Times New Roman Bold.ttf",
            format: "ttf",
            provider: "file",
          },
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
          {
            identifier: "tinos-regular",
            fontFamily: "Tinos",
            fontWeight: 400,
            fontURI: "file:///fonts/Tinos-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "tinos-bold",
            fontFamily: "Tinos",
            fontWeight: 700,
            fontURI: "file:///fonts/Tinos-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "arimo-regular",
            fontFamily: "Arimo",
            fontWeight: 400,
            fontURI: "file:///fonts/Arimo-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "arimo-bold",
            fontFamily: "Arimo",
            fontWeight: 700,
            fontURI: "file:///fonts/Arimo-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "eb-garamond-regular",
            fontFamily: "EB Garamond",
            fontWeight: 400,
            fontURI: "file:///fonts/EBGaramond-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "eb-garamond-bold",
            fontFamily: "EB Garamond",
            fontWeight: 700,
            fontURI: "file:///fonts/EBGaramond-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "raleway-regular",
            fontFamily: "Raleway",
            fontWeight: 400,
            fontURI: "file:///fonts/Raleway-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "raleway-bold",
            fontFamily: "Raleway",
            fontWeight: 700,
            fontURI: "file:///fonts/Raleway-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "comic-neue-regular",
            fontFamily: "Comic Neue",
            fontWeight: 400,
            fontURI: "file:///fonts/ComicNeue-Regular.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "comic-neue-bold",
            fontFamily: "Comic Neue",
            fontWeight: 700,
            fontURI: "file:///fonts/ComicNeue-Bold.ttf",
            format: "ttf",
            provider: "file",
          },
        ],
      },
    })

    const psdBuffer = fs.readFileSync(psdPath)
    const psdArrayBuffer = psdBuffer.buffer.slice(psdBuffer.byteOffset, psdBuffer.byteOffset + psdBuffer.byteLength)

    const psdParser = await PSDParser.fromFile(instance, psdArrayBuffer, createPNGJSEncodeBufferToPNG(PNG))
    await psdParser.parse()

    const allBlocks = instance.block.findAll()
    const textLayerData = []

    for (const blockId of allBlocks) {
      const blockType = instance.block.getType(blockId)
      if (blockType === "//ly.img.ubq/text") {
        const textProperties = {
          "text/automaticFontSizeEnabled": instance.block.getBool(blockId, "text/automaticFontSizeEnabled"),
          "text/clipLinesOutsideOfFrame": instance.block.getBool(blockId, "text/clipLinesOutsideOfFrame"),
          "text/externalReference": instance.block.getString(blockId, "text/externalReference"),
          "text/fontFileUri": instance.block.getString(blockId, "text/fontFileUri"),
          "text/fontSize": instance.block.getFloat(blockId, "text/fontSize"),
          "text/hasClippedLines": instance.block.getBool(blockId, "text/hasClippedLines"),
          "text/horizontalAlignment": instance.block.getString(blockId, "text/horizontalAlignment"),
          "text/letterSpacing": instance.block.getFloat(blockId, "text/letterSpacing"),
          "text/lineHeight": instance.block.getFloat(blockId, "text/lineHeight"),
          "text/maxAutomaticFontSize": instance.block.getFloat(blockId, "text/maxAutomaticFontSize"),
          "text/minAutomaticFontSize": instance.block.getFloat(blockId, "text/minAutomaticFontSize"),
          "text/paragraphSpacing": instance.block.getFloat(blockId, "text/paragraphSpacing"),
          "text/text": instance.block.getString(blockId, "text/text"),
          "text/verticalAlignment": instance.block.getString(blockId, "text/verticalAlignment"),
        }

        // Extrair o nome da tipografia
        const typefaceId = instance.block.getString(blockId, "text/typeface")
        if (typefaceId) {
          const typeface = instance.engine.config.text.fonts.find(font => font.identifier === typefaceId);
          if (typeface) {
            textProperties["text/typeface"] = typeface.fontFamily;
          } else {
            textProperties["text/typeface"] = "Unknown (ID: " + typefaceId + ")";
          }
        } else {
          textProperties["text/typeface"] = "Unknown (No ID)";
        }

        textLayerData.push({
          name: instance.block.getName(blockId),
          properties: textProperties,
        })
      }
    }

    res.json({ success: true, data: textLayerData })
  } catch (error) {
    logToFile(
      `Erro ao extrair dados do PSD: ${error?.message || error}\nNome do Erro: ${error?.name}\nErro Completo: ${error?.toString()}\nStack: ${error?.stack}`,
    )
    res.status(500).json({ success: false, message: "Erro ao extrair dados do PSD", error: error?.message || error })
  } finally {
    if (instance) {
      instance.dispose()
    }
  }
})

// Nova rota POST para extração de fontes usando apenas análise binária
app.post("/extract-fonts-binary", async (req, res) => {
  const { psdPath } = req.body

  if (!psdPath) {
    return res.status(400).json({ success: false, message: "Parâmetro psdPath é obrigatório." })
  }

  if (!fs.existsSync(psdPath)) {
    return res.status(400).json({ success: false, message: "Arquivo PSD não encontrado." })
  }

  logToFile(`[BinaryExtraction] Iniciando extração binária para: ${psdPath}`)

  try {
    // Executa apenas a análise binária
    const binaryResults = await extractFontsWithBinaryAnalysis(psdPath)

    logToFile(`[BinaryExtraction] Análise binária concluída. Fontes encontradas: ${binaryResults.total_fonts}`)
    logToFile(`[BinaryExtraction] FONTES: ${(binaryResults.fonts_found || []).join(', ')}`)

    const outputFile = psdPath.replace('.psd', '_fonts_binary.json')

    res.json({
      success: true,
      message: `Extração binária concluída. Resultado salvo em: ${outputFile}`,
      summary: {
        total_fonts: binaryResults.total_fonts,
        extraction_method: 'binary_analysis_only'
      },
      fonts_found: binaryResults.fonts_found || [],
      all_matches: binaryResults.all_matches || [],
      output_file: outputFile,
      full_results: binaryResults
    })

  } catch (error) {
    logToFile(`[BinaryExtraction] Erro: ${error.message}\nStack: ${error.stack}`)
    res.status(500).json({
      success: false,
      message: "Erro na extração binária",
      error: error.message
    })
  }
})

// Nova rota POST para extração de fontes com associação por camada
app.post("/extract-fonts-per-layer", async (req, res) => {
  const { psdPath } = req.body

  if (!psdPath) {
    return res.status(400).json({ success: false, message: "Parâmetro psdPath é obrigatório." })
  }

  if (!fs.existsSync(psdPath)) {
    return res.status(400).json({ success: false, message: "Arquivo PSD não encontrado." })
  }

  logToFile(`[PerLayerExtraction] Iniciando extração por camada para: ${psdPath}`)

  try {
    // Executa análise por camada
    const results = await extractFontsPerLayer(psdPath)

    // Prepara resposta estruturada
    const response = {
      success: true,
      message: `Extração inteligente concluída. ${results.summary.total_text_layers} camadas processadas, ${results.summary.association_success} associações realizadas.`,
      summary: {
        total_text_layers: results.summary.total_text_layers,
        total_fonts: results.summary.total_fonts,
        association_success: results.summary.association_success,
        extraction_method: 'smart_binary_analysis'
      },
      all_fonts_found: results.summary.all_fonts_found,
      layers: results.layers.map(layer => ({
        layer_name: layer.layer_name,
        text_content: layer.text_content,
        fonts_found: layer.fonts_found || [],
        association_method: layer.association_method
      })),
      output_file: psdPath.replace('.psd', '_fonts_smart.json'),
      raw_results: results
    }

    logToFile(`[SmartExtraction] Extração concluída. ${results.summary.total_text_layers} camadas, ${results.summary.total_fonts} fontes, ${results.summary.association_success} associações`)
    
    res.json(response)

  } catch (error) {
    logToFile(`[PerLayerExtraction] Erro: ${error.message}\nStack: ${error.stack}`)
    res.status(500).json({
      success: false,
      message: "Erro na extração por camada",
      error: error.message
    })
  }
})

// Nova rota POST para extração híbrida de fontes (CE.SDK + Análise Binária)
app.post("/extract-fonts-hybrid", async (req, res) => {
  const { psdPath } = req.body

  if (!psdPath) {
    return res.status(400).json({ success: false, message: "Parâmetro psdPath é obrigatório." })
  }

  if (!fs.existsSync(psdPath)) {
    return res.status(400).json({ success: false, message: "Arquivo PSD não encontrado." })
  }

  logToFile(`[HybridExtraction] Iniciando extração híbrida para: ${psdPath}`)

  let instance = null
  let binaryResults = null
  let cesdkResults = []

  try {
    // 1. Executa a análise binária em paralelo
    logToFile(`[HybridExtraction] Executando análise binária...`)
    const binaryPromise = extractFontsWithBinaryAnalysis(psdPath).catch(error => {
      logToFile(`[HybridExtraction] Análise binária falhou: ${error.message}`)
      return { fonts_found: [], total_fonts: 0, extraction_method: 'binary_analysis', error: error.message }
    })

    // 2. Executa extração via CE.SDK
    logToFile(`[HybridExtraction] Inicializando CE.SDK...`)
    instance = await CESDK.init({
      license: "GoLCfXI3NJKzx27wMBOCHQSdQEj6Z5lpzq7ubQGrk6u-e6ymEsPzZ4tso5Dxe4vx",
      headless: true,
      ui: { typefaceLibraries: [] },
      fontResolver: customFontResolver,
      text: {
        fonts: [
          {
            identifier: "bebas-neue-bold",
            fontFamily: "Bebas Neue",
            fontWeight: 700,
            fontURI: "file:///fonts/BebasNeue Bold.otf",
            format: "otf",
            provider: "file",
          },
          {
            identifier: "arial-regular",
            fontFamily: "Arial",
            fontWeight: 400,
            fontURI: "file:///fonts/Arial.ttf",
            format: "ttf",
            provider: "file",
          },
          {
            identifier: "times-new-roman-regular",
            fontFamily: "Times New Roman",
            fontWeight: 400,
            fontURI: "file:///fonts/Times New Roman.ttf",
            format: "ttf",
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

    // Extrai fontes via CE.SDK
    logToFile(`[HybridExtraction] Extraindo fontes via CE.SDK...`)
    const allBlocks = instance.block.findAll()
    
    for (const blockId of allBlocks) {
      const name = instance.block.getName(blockId)
      const type = instance.block.getType(blockId)

      if (type === "//ly.img.ubq/text" && name) {
        logToFile(`[HybridExtraction] Processando camada de texto: ${name}`)
        
        const layerData = {
          layerName: name,
          text: null,
          fontName: null,
          fontSize: null,
          fontWeight: null,
          extractionMethod: 'cesdk'
        }

        try {
          // Extrai texto
          layerData.text = instance.block.getString(blockId, "text/text")
          
          // Extrai tamanho da fonte
          layerData.fontSize = instance.block.getFloat(blockId, "text/fontSize")
          
          // Tenta extrair nome da fonte com múltiplos métodos
          const fontExtractionMethods = [
            // Método 1: getTypeface()
            () => {
              const typeface = instance.block.getTypeface(blockId)
              if (typeface && typeface.name) return typeface.name
              if (typeface && typeface.id) return typeface.id
              return null
            },
            // Método 2: text/typeface property
            () => {
              const typefaceId = instance.block.getString(blockId, "text/typeface")
              if (typefaceId) {
                const configuredFont = instance.config.text.fonts.find(font => font.identifier === typefaceId)
                return configuredFont ? configuredFont.fontFamily : `Unknown (ID: ${typefaceId})`
              }
              return null
            },
            // Método 3: propriedades de fonte específicas
            () => {
              const fontProps = [
                "text/fontFamily", "text/fontName", "text/postScriptName", 
                "text/displayName", "text/familyName", "text/styleName"
              ]
              for (const prop of fontProps) {
                try {
                  const value = instance.block.getString(blockId, prop)
                  if (value && value.trim() !== "") return value
                } catch (e) { /* continua tentando */ }
              }
              return null
            },
            // Método 4: getTypefaces() com range
            () => {
              const textContent = layerData.text || ""
              if (textContent.length > 0) {
                const typefaces = instance.block.getTypefaces(blockId, 0, textContent.length)
                if (typefaces && typefaces.length > 0) {
                  const firstTypeface = typefaces[0]
                  return firstTypeface?.name || firstTypeface?.id || null
                }
              }
              return null
            },
            // Método 5: text/fontFileUri (extrai nome do caminho)
            () => {
              const fontFileUri = instance.block.getString(blockId, "text/fontFileUri")
              if (fontFileUri) {
                const fontFileName = fontFileUri.split("/").pop().split("\\").pop()
                return fontFileName.replace(/\.(ttf|otf|woff|woff2)$/i, "")
              }
              return null
            }
          ]

          for (let i = 0; i < fontExtractionMethods.length; i++) {
            try {
              const fontName = fontExtractionMethods[i]()
              if (fontName) {
                layerData.fontName = fontName
                logToFile(`[HybridExtraction] Fonte extraída para ${name} via método ${i + 1}: ${fontName}`)
                break
              }
            } catch (e) {
              logToFile(`[HybridExtraction] Método ${i + 1} falhou para ${name}: ${e.message}`)
              continue
            }
          }

          if (!layerData.fontName) {
            logToFile(`[HybridExtraction] NENHUM método conseguiu extrair fonte para ${name}`)
            layerData.fontName = "Unknown"
          }

          // Tenta extrair peso da fonte
          try {
            const textContent = layerData.text || ""
            if (textContent.length > 0) {
              const fontWeights = instance.block.getTextFontWeights(blockId, 0, textContent.length)
              if (fontWeights && fontWeights.length > 0) {
                layerData.fontWeight = fontWeights[0]
              }
            }
          } catch (e) {
            logToFile(`[HybridExtraction] Não foi possível extrair peso da fonte para ${name}: ${e.message}`)
          }

          cesdkResults.push(layerData)
          
        } catch (error) {
          logToFile(`[HybridExtraction] Erro ao processar camada ${name}: ${error.message}`)
          cesdkResults.push({
            layerName: name,
            error: error.message,
            extractionMethod: 'cesdk'
          })
        }
      }
    }

    // 3. Aguarda resultado da análise binária
    binaryResults = await binaryPromise

    // 4. Combina os resultados
    const combinedResults = {
      source_file: psdPath,
      extraction_methods: ['cesdk', 'binary_analysis'],
      cesdk_results: {
        total_text_layers: cesdkResults.length,
        layers: cesdkResults,
        unique_fonts: [...new Set(cesdkResults.map(layer => layer.fontName).filter(Boolean))]
      },
      binary_results: binaryResults,
      combined_fonts: []
    }

    // Combina fontes únicas de ambos os métodos
    const allFonts = new Set()
    
    // Adiciona fontes do CE.SDK (mesmo se "Unknown")
    const cesdkFonts = new Set()
    cesdkResults.forEach(layer => {
      if (layer.fontName && layer.fontName !== "Unknown" && layer.fontName !== null) {
        cesdkFonts.add(layer.fontName)
        allFonts.add(layer.fontName)
      }
    })
    
    // Adiciona fontes da análise binária
    const binaryFonts = new Set()
    if (binaryResults.fonts_found && binaryResults.fonts_found.length > 0) {
      binaryResults.fonts_found.forEach(font => {
        binaryFonts.add(font)
        allFonts.add(font)
      })
    }

    // Se CE.SDK não encontrou fontes mas análise binária sim, tenta mapear
    if (cesdkFonts.size === 0 && binaryFonts.size > 0) {
      logToFile(`[HybridExtraction] CE.SDK não encontrou fontes, usando apenas análise binária`)
      // Atualiza as camadas com as fontes da análise binária (tentativa de mapeamento)
      const binaryFontsArray = Array.from(binaryFonts)
      cesdkResults.forEach((layer, index) => {
        if (layer.fontName === "Unknown" || layer.fontName === null) {
          // Tenta mapear baseado na ordem ou no texto
          if (binaryFontsArray[index % binaryFontsArray.length]) {
            layer.fontName = binaryFontsArray[index % binaryFontsArray.length]
            layer.extractionMethod = 'binary_mapped'
            logToFile(`[HybridExtraction] Mapeou ${layer.layerName} -> ${layer.fontName} via análise binária`)
          }
        }
      })
    }

    combinedResults.combined_fonts = Array.from(allFonts).sort()
    combinedResults.cesdk_results.unique_fonts = Array.from(cesdkFonts).sort()

    // 5. Salva resultado combinado
    const outputFile = psdPath.replace('.psd', '_fonts_hybrid.json')
    fs.writeFileSync(outputFile, JSON.stringify(combinedResults, null, 2))

    logToFile(`[HybridExtraction] Extração híbrida concluída. Fontes únicas encontradas: ${combinedResults.combined_fonts.length}`)
    logToFile(`[HybridExtraction] CE.SDK: ${combinedResults.cesdk_results.unique_fonts.length} fontes`)
    logToFile(`[HybridExtraction] Análise binária: ${binaryResults.total_fonts} fontes`)
    logToFile(`[HybridExtraction] FONTES COMBINADAS: ${combinedResults.combined_fonts.join(', ')}`)
    logToFile(`[HybridExtraction] FONTES CE.SDK: ${combinedResults.cesdk_results.unique_fonts.join(', ')}`)
    logToFile(`[HybridExtraction] FONTES BINÁRIAS: ${(binaryResults.fonts_found || []).join(', ')}`)

    res.json({
      success: true,
      message: `Extração híbrida concluída. Resultado salvo em: ${outputFile}`,
      summary: {
        total_unique_fonts: combinedResults.combined_fonts.length,
        cesdk_fonts: combinedResults.cesdk_results.unique_fonts.length,
        binary_fonts: binaryResults.total_fonts,
        text_layers_processed: cesdkResults.length
      },
      fonts_found: {
        combined: combinedResults.combined_fonts,
        cesdk_only: combinedResults.cesdk_results.unique_fonts,
        binary_only: binaryResults.fonts_found || [],
        cesdk_layers: cesdkResults.map(layer => ({
          layerName: layer.layerName,
          fontName: layer.fontName,
          text: layer.text,
          fontSize: layer.fontSize
        }))
      },
      output_file: outputFile
    })

  } catch (error) {
    logToFile(`[HybridExtraction] Erro geral: ${error.message}\nStack: ${error.stack}`)
    res.status(500).json({
      success: false,
      message: "Erro na extração híbrida",
      error: error.message,
      cesdk_results: cesdkResults,
      binary_results: binaryResults
    })
  } finally {
    if (instance) {
      instance.dispose()
    }
  }
})

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`)
  console.log(`Rotas de geração de imagem disponíveis:`)
  console.log(`  - http://localhost:${port}/generate-images-batch (geração tradicional)`)
  console.log(`  - http://localhost:${port}/generate-images-batch-smart (com extração automática de fontes)`)
  console.log(`Rotas de extração de fontes disponíveis:`)
  console.log(`  - http://localhost:${port}/extract-fonts-binary (apenas análise binária)`)
  console.log(`  - http://localhost:${port}/extract-fonts-per-layer (fontes por camada)`)
  console.log(`  - http://localhost:${port}/extract-fonts-hybrid (híbrida CE.SDK + binária)`)
  logToFile(`Servidor iniciado em http://localhost:${port}`)
})
