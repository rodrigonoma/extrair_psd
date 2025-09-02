const CESDK = require('@cesdk/node');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const express = require('express');
const { PSDParser, createPNGJSEncodeBufferToPNG } = require('@imgly/psd-importer');
const { PNG } = require('pngjs');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(`[LOGGING TO FILE] ${logMessage.trim()}`);
  try {
    fs.appendFileSync('log_error.txt', logMessage, { encoding: 'utf8', flag: 'a' });
  } catch (error) {
    console.error(`ERRO AO ESCREVER NO LOG_ERROR.TXT: ${error.message}`);
  }
}

// Função para limpar o nome da família da fonte
function cleanFontFamily(fontFamily) {
  if (!fontFamily) return '';
  // Pega a primeira parte antes de um separador comum e trata PascalCase
  const cleaned = fontFamily.split(/[-_ ]/)[0].replace(/([a-z])([A-Z])/g, '$1 $2');
  logToFile(`[CleanFont] Nome original: "${fontFamily}", Nome limpo: "${cleaned}"`);
  return cleaned;
}

// Constantes e helpers de fontes
const WEIGHT_ALIAS_MAP = { "100": "thin", "200": "extraLight", "300": "light", regular: "normal", "400": "normal", "500": "medium", "600": "semiBold", "700": "bold", "800": "extraBold", "900": "heavy" };
const TYPEFACE_ALIAS_MAP = { Helvetica: "Roboto", "Times New Roman": "Tinos", Arial: "Arimo", Georgia: "Tinos", Garamond: "EB Garamond", Futura: "Raleway", "Comic Sans MS": "Comic Neue" };
const SYSTEM_FALLBACK_FONT = { identifier: 'system-Arial', fontFamily: 'Arial', fontWeight: 400, provider: 'system' };

// Busca no Google Fonts
async function findFontInGoogleFonts(familyToSearch) {
  try {
    const apiKey = process.env.GOOGLE_FONTS_API_KEY;
    if (!apiKey) {
      logToFile('[GoogleFonts] Nenhuma chave API definida, pulando.');
      return null;
    }
    const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=alpha`;
    const response = await fetch(url );
    if (!response.ok) {
        logToFile(`[GoogleFonts] Erro na API: ${response.statusText}`);
        return null;
    }
    const data = await response.json();
    const match = data.items.find(item => item.family.toLowerCase() === familyToSearch.toLowerCase());
    if (match) {
      logToFile(`[GoogleFonts] Fonte encontrada: ${match.family}`);
      return { identifier: `google-${match.family}`, fontFamily: match.family, fontWeight: 400, provider: 'google', fontURI: match.files.regular || Object.values(match.files)[0] };
    }
  } catch (err) {
    logToFile(`[GoogleFonts] Erro ao buscar: ${err.message}`);
  }
  return null;
}

// Busca na pasta local "fonts"
function findFontInLocalFolder(familyToSearch) {
  try {
    const fontsDir = path.join(__dirname, 'fonts');
    if (!fs.existsSync(fontsDir)) return null;
    const files = fs.readdirSync(fontsDir);
    const matchFile = files.find(file =>
      path.basename(file, path.extname(file)).toLowerCase().includes(familyToSearch.toLowerCase())
    );
    if (matchFile) {
      const ext = path.extname(matchFile).replace('.', '');
      logToFile(`[LocalFonts] Fonte encontrada: ${matchFile}`);
      return { identifier: `local-${familyToSearch}`, fontFamily: familyToSearch, fontWeight: 400, fontURI: `file:///${path.join(fontsDir, matchFile)}`, format: ext, provider: 'file' };
    }
  } catch (err) {
    logToFile(`[LocalFonts] Erro ao buscar: ${err.message}`);
  }
  return null;
}

// RESOLVEDOR DE FONTES CORRIGIDO
async function customFontResolver(fontParameters, engine) {
  logToFile(`[Resolver] Iniciando: Família="${fontParameters.family}", Peso="${fontParameters.weight}", Estilo="${fontParameters.style}"`);
  
  const familyToSearch = cleanFontFamily(fontParameters.family);
  if (!familyToSearch) {
    logToFile(`[Resolver] Nome da família inválido. Usando fallback.`);
    const fallback = { ...SYSTEM_FALLBACK_FONT, source: 'Sistema (Fallback)' };
    return { typeface: { id: 'system-fallback', name: 'Arial', fonts: [fallback] }, font: fallback };
  }

  let finalFamilyToSearch = TYPEFACE_ALIAS_MAP[familyToSearch] || familyToSearch;
  if (TYPEFACE_ALIAS_MAP[familyToSearch]) logToFile(`[Resolver] Usando alias: "${familyToSearch}" -> "${finalFamilyToSearch}"`);

  let foundFont = null;
  let source = 'Desconhecido';

  foundFont = await findFontInGoogleFonts(finalFamilyToSearch);
  if (foundFont) source = 'Google Fonts';

  if (!foundFont) {
    foundFont = findFontInLocalFolder(finalFamilyToSearch);
    if (foundFont) source = 'Local';
  }

  if (!foundFont) {
    const configuredFonts = engine.config.get("text/fonts") || [];
    foundFont = configuredFonts.find(f => f.fontFamily === finalFamilyToSearch);
    if (foundFont) source = 'Configurada';
  }

  if (!foundFont) {
    logToFile(`[Resolver] Fonte "${finalFamilyToSearch}" não encontrada em nenhuma fonte. Usando fallback.`);
    foundFont = { ...SYSTEM_FALLBACK_FONT };
    source = 'Sistema (Fallback)';
  }

  logToFile(`[Resolver] Resolvido: Família="${foundFont.fontFamily}", Origem="${source}"`);
  
  foundFont.source = source; // Anexa a origem para extração posterior
  const typeface = { id: foundFont.identifier || `id-${foundFont.fontFamily}`, name: foundFont.fontFamily, fonts: [foundFont] };
  return { typeface, font: foundFont };
}

// ... (suas outras funções como generateSingleImage e as rotas /generate-images-batch, /generate-image permanecem as mesmas)
async function generateSingleImage(instance, psdPath, data, outputPath) {
  logToFile(`[generateSingleImage] Iniciando geração para: ${outputPath}`);
  try {
    const psdBuffer = fs.readFileSync(psdPath);
    const psdArrayBuffer = psdBuffer.buffer.slice(psdBuffer.byteOffset, psdBuffer.byteOffset + psdBuffer.byteLength);
    
    const psdParser = await PSDParser.fromFile(instance, psdArrayBuffer, createPNGJSEncodeBufferToPNG(PNG));
    await psdParser.parse();

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const block = instance.block.findByName(key)[0];
        if (block) {
          const blockType = instance.block.getType(block);
          logToFile(`[ApplyData] Camada '${key}' encontrada. Tipo: ${blockType}`);
          if (blockType === '//ly.img.ubq/text' || blockType === '//ly.img.ubq/graphic') {
            for (const propName in data[key]) {
              if (data[key].hasOwnProperty(propName)) {
                const propValue = data[key][propName];
                if (propName === 'uri' || propName === 'position' || propName === 'backgroundColor') {
                  continue;
                }
                try {
                  if (typeof propValue === 'string') {
                    instance.block.setString(block, propName, propValue);
                  } else if (typeof propValue === 'number') {
                    instance.block.setFloat(block, propName, propValue);
                  } else if (typeof propValue === 'boolean') {
                    instance.block.setBool(block, propName, propValue);
                  } else if (typeof propValue === 'object' && propValue !== null) {
                    if ('r' in propValue && 'g' in propValue && 'b' in propValue && 'a' in propValue) {
                      if (propName === 'color' && blockType === '//ly.img.ubq/text') {
                        const colorFill = instance.block.createFill('color');
                        instance.block.setColor(colorFill, 'fill/color/value', propValue);
                        instance.block.setFill(block, colorFill);
                      } else {
                        instance.block.setColor(block, propName, propValue);
                      }
                    } else {
                      instance.block.setStruct(block, propName, propValue);
                    }
                  }
                } catch (e) {
                  logToFile(`[ApplyData] Erro ao definir propriedade '${propName}' para ${key}: ${e.message}`);
                }
              }
            }
            if (blockType === '//ly.img.ubq/graphic' && data[key].uri !== undefined) {
              const imageFill = instance.block.createFill('image');
              instance.block.setString(imageFill, 'fill/image/imageFileURI', data[key].uri);
              instance.block.setFill(block, imageFill);
            }
            if (data[key].position !== undefined) {
              const { x, y, width, height } = data[key].position;
              instance.block.setFloat(block, 'position/x', x);
              instance.block.setFloat(block, 'position/y', y);
              instance.block.setFloat(block, 'width', width);
              instance.block.setFloat(block, 'height', height);
            }
          }
        }
      }
    }

    const pageBlock = instance.block.findByType('page')[0];
    if (!pageBlock) throw new Error('Nenhum bloco de página encontrado na cena.');

    const result = await instance.block.export(pageBlock, 'image/png');
    const imageBuffer = Buffer.from(await result.arrayBuffer());
    fs.writeFileSync(outputPath, imageBuffer);
    return { success: true, message: `Imagem gerada com sucesso em: ${outputPath}` };
  } catch (error) {
    logToFile(`Erro ao gerar imagem: ${error?.message || error}\nStack: ${error?.stack}`);
    return { success: false, message: 'Erro ao gerar imagem', error: error?.message || error };
  }
}

app.post('/generate-images-batch', async (req, res) => {
  const { psdPath, items, outputPathBase } = req.body;
  if (!psdPath || !items || !Array.isArray(items) || !outputPathBase) {
    return res.status(400).json({ success: false, message: 'Parâmetros psdPath, items (array) e outputPathBase são obrigatórios.' });
  }
  let instance = null;
  const results = [];
  try {
    instance = await CESDK.init({
      license: 'GoLCfXI3NJKzx27wMBOCHQSdQEj6Z5lpzq7ubQGrk6u-e6ymEsPzZ4tso5Dxe4vx',
      headless: true,
      ui: { typefaceLibraries: [] },
      fontResolver: customFontResolver,
      text: { 
        fonts: [
          { identifier: 'Inter_28pt-Bold',
            fontFamily: 'Inter 28pt',
            fontWeight: 700,
            fontURI: 'file:///C:/imgly_novo/fonts/Inter_28pt-Bold.ttf',
            format: 'ttf',
            provider: 'file'
          },
          { identifier: 'bebas-neue-bold',
            fontFamily: 'Bebas Neue',
            fontWeight: 700,
            fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Bold.otf',
            format: 'otf',
            provider: 'file'
          },
          { identifier: 'bebas-neue-book', 
            fontFamily: 'Bebas Neue',
            fontWeight: 400, 
            fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Book.otf',
            format: 'otf',
            provider: 'file'
          },
          { identifier: 'bebas-neue-light',
            fontFamily: 'Bebas Neue',
            fontWeight: 300,
            fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Light.otf',
            format: 'otf',
            provider: 'file'
          },
          { identifier: 'bebas-neue-regular',
            fontFamily: 'Bebas Neue',
            fontWeight: 400,
            fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Regular.otf',
            format: 'otf',
            provider: 'file'
          }, {
            identifier: 'bebas-neue-thin',
            fontFamily: 'Bebas Neue',
            fontWeight: 100,
            fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Thin.otf',
            format: 'otf',
            provider: 'file'
          } ] }
    });
    instance.asset.addLocalSource('ly.img.google-fonts', { type: 'ly.img.asset.typeface', payload: { typefaces: [] } });
    for (let i = 0; i < items.length; i++) {
      const itemData = items[i].data;
      const uniqueOutputPath = `${outputPathBase}${i}.png`;
      logToFile(`Processando item ${i + 1}/${items.length} para ${uniqueOutputPath}`);
      const itemResult = await generateSingleImage(instance, psdPath, itemData, uniqueOutputPath);
      results.push({ index: i, outputPath: uniqueOutputPath, ...itemResult });
    }
    res.json({ success: true, results });
  } catch (error) {
    logToFile(`Erro no processamento em lote: ${error.message}\nStack: ${error.stack}`);
    res.status(500).json({ success: false, message: 'Erro no processamento em lote', error: error.message });
  } finally {
    if (instance) instance.dispose();
  }
});

app.post('/generate-image', async (req, res) => {
  const { psdPath, data, outputPath } = req.body;
  if (!psdPath || !data || !outputPath) {
    return res.status(400).json({ success: false, message: 'Parâmetros psdPath, data e outputPath são obrigatórios.' });
  }
  let instance = null;
  try {
    instance = await CESDK.init({
      license: 'GoLCfXI3NJKzx27wMBOCHQSdQEj6Z5lpzq7ubQGrk6u-e6ymEsPzZ4tso5Dxe4vx',
      headless: true,
      ui: { typefaceLibraries: [] },
      fontResolver: customFontResolver,
      text: { fonts: [ { identifier: 'bebas-neue-bold', fontFamily: 'Bebas Neue', fontWeight: 700, fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Bold.otf', format: 'otf', provider: 'file' }, { identifier: 'bebas-neue-book', fontFamily: 'Bebas Neue', fontWeight: 400, fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Book.otf', format: 'otf', provider: 'file' }, { identifier: 'bebas-neue-light', fontFamily: 'Bebas Neue', fontWeight: 300, fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Light.otf', format: 'otf', provider: 'file' }, { identifier: 'bebas-neue-regular', fontFamily: 'Bebas Neue', fontWeight: 400, fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Regular.otf', format: 'otf', provider: 'file' }, { identifier: 'bebas-neue-thin', fontFamily: 'Bebas Neue', fontWeight: 100, fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Thin.otf', format: 'otf', provider: 'file' } ] }
    });
    instance.asset.addLocalSource('ly.img.google-fonts', { type: 'ly.img.asset.typeface', payload: { typefaces: [] } });
    const result = await generateSingleImage(instance, psdPath, data, outputPath);
    res.json(result);
  } catch (error) {
    logToFile(`Erro ao gerar imagem: ${error.message}\nStack: ${error.stack}`);
    res.status(500).json({ success: false, message: 'Erro ao gerar imagem', error: error.message });
  } finally {
    if (instance) instance.dispose();
  }
});

// ROTA DE EXTRAÇÃO DE DADOS COMPLETA E CORRIGIDA
app.post('/extract-psd-data', async (req, res) => {
  const { psdPath } = req.body;
  if (!psdPath) return res.status(400).json({ success: false, message: 'Parâmetro psdPath é obrigatório.' });

  let instance = null;
  try {
    const configuredFonts = [
        { identifier: 'bebas-neue-bold', fontFamily: 'Bebas Neue', fontWeight: 700, fontURI: 'file:///C:/imgly_novo/fonts/BebasNeue Bold.otf', format: 'otf', provider: 'file' },
        // ... outras fontes
    ];

    instance = await CESDK.init({
      license: 'GoLCfXI3NJKzx27wMBOCHQSdQEj6Z5lpzq7ubQGrk6u-e6ymEsPzZ4tso5Dxe4vx',
      headless: true,
      ui: { typefaceLibraries: [] },
      fontResolver: customFontResolver,
      text: { fonts: configuredFonts }
    });

    instance.asset.addLocalSource('ly.img.google-fonts', { type: 'ly.img.asset.typeface', payload: { typefaces: [] } });

    const psdBuffer = fs.readFileSync(psdPath);
    const psdArrayBuffer = psdBuffer.buffer.slice(psdBuffer.byteOffset, psdBuffer.byteOffset + psdBuffer.byteLength);
    const psdParser = await PSDParser.fromFile(instance, psdArrayBuffer, createPNGJSEncodeBufferToPNG(PNG));
    await psdParser.parse();

    const allBlocks = instance.block.findAll();
    const extractedData = {};

    for (const blockId of allBlocks) {
      const name = instance.block.getName(blockId);
      const type = instance.block.getType(blockId);
      
      if (name && type) {
        const properties = { type };

        // **LOOP DE EXTRAÇÃO DE PROPRIEDADES RESTAURADO**
        const allProps = instance.block.findAllProperties(blockId);
        for (const prop of allProps) {
          try {
            let value;
            if (prop.includes('color')) {
              value = instance.block.getColor(blockId, prop);
            } else {
              try { value = instance.block.getFloat(blockId, prop); }
              catch (e1) {
                try { value = instance.block.getString(blockId, prop); }
                catch (e2) {
                  try { value = instance.block.getBool(blockId, prop); }
                  catch (e3) { continue; }
                }
              }
            }
            properties[prop.replace(/\//g, '_')] = value;
          } catch (e) { /* Ignora propriedades que não podem ser lidas */ }
        }

        if (type === '//ly.img.ubq/text') {
          try {
            const originalTypeface = instance.block.getString(blockId, 'text/typeface');
            const fontFileUri = instance.block.getString(blockId, 'text/fontFileUri');
            
            // Chama o resolver para obter os detalhes da fonte que FOI resolvida
            const fontResolution = await customFontResolver({ family: originalTypeface }, instance.engine);
            const resolvedFont = fontResolution.font;

            properties.fontInfo = {
              originalTypeface: originalTypeface || "Não especificado no PSD",
              resolvedFamily: resolvedFont.fontFamily,
              weight: resolvedFont.fontWeight,
              source: resolvedFont.source,
              finalURI: fontFileUri // A URI final que o SDK usou
            };
          } catch (err) {
              logToFile(`[ExtractData] Erro ao obter info de fonte para ${name}: ${err.message}\n${err.stack}`);
              properties.fontInfo = { error: 'Não foi possível extrair informações da fonte.', details: err.message };
          }
        }
        
        extractedData[name] = properties;
      }
    }

    const outputFilePath = 'dados_psd_extraidos.json';
    fs.writeFileSync(outputFilePath, JSON.stringify(extractedData, null, 2));
    logToFile(`Dados do PSD extraídos e salvos em: ${outputFilePath}`);

    res.json({ success: true, message: `Dados do PSD extraídos e salvos em ${outputFilePath}`, data: extractedData });

  } catch (error) {
    logToFile(`Erro ao extrair dados do PSD: ${error?.message || error}\nStack: ${error.stack}`);
    res.status(500).json({ success: false, message: 'Erro ao extrair dados do PSD', error: error?.message || error });
  } finally {
    if (instance) instance.dispose();
  }
});


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}` );
  logToFile(`Servidor iniciado em http://localhost:${port}` );
});
