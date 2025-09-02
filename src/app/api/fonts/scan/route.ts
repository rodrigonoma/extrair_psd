import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface FontMetadata {
  name: string;
  fileName: string;
  uri: string;
  style: 'normal' | 'italic';
  weight: 'thin' | 'extraLight' | 'light' | 'normal' | 'medium' | 'semiBold' | 'bold' | 'extraBold' | 'heavy';
  subFamily: string;
}

interface FontDefinition {
  name: string;
  fonts: FontMetadata[];
}

interface FontScanResult {
  success: boolean;
  fonts: Record<string, FontDefinition>;
  newFonts: string[];
  errors: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<FontScanResult>> {
  try {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    
    // Verificar se a pasta fonts existe
    if (!fs.existsSync(fontsDir)) {
      return NextResponse.json({
        success: false,
        fonts: {},
        newFonts: [],
        errors: ['Pasta public/fonts não encontrada']
      });
    }

    // Ler todos os arquivos de fonte
    const fontFiles = fs.readdirSync(fontsDir)
      .filter(file => /\.(otf|ttf|woff|woff2)$/i.test(file));

    console.log('Arquivos de fonte encontrados:', fontFiles);

    const fonts: Record<string, FontDefinition> = {};
    const newFonts: string[] = [];
    const errors: string[] = [];

    for (const fileName of fontFiles) {
      try {
        const fontMetadata = extractFontMetadata(fileName);
        
        if (!fonts[fontMetadata.name]) {
          fonts[fontMetadata.name] = {
            name: fontMetadata.name,
            fonts: []
          };
          newFonts.push(fontMetadata.name);
        }
        
        fonts[fontMetadata.name].fonts.push(fontMetadata);
        
      } catch (error) {
        errors.push(`Erro ao processar ${fileName}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      fonts,
      newFonts,
      errors
    });
    
  } catch (error) {
    console.error('Erro no scan de fontes:', error);
    return NextResponse.json({
      success: false,
      fonts: {},
      newFonts: [],
      errors: [`Erro interno: ${error.message}`]
    });
  }
}

function extractFontMetadata(fileName: string): FontMetadata {
  // Remove extensão
  const nameWithoutExt = fileName.replace(/\.(otf|ttf|woff|woff2)$/i, '');
  
  // Detectar peso da fonte baseado no nome do arquivo
  let weight: FontMetadata['weight'] = 'normal';
  let subFamily = 'Regular';
  let baseName = nameWithoutExt;
  
  // Mapeamento de pesos mais comum
  const weightMap: Record<string, FontMetadata['weight']> = {
    'thin': 'thin',
    'extralight': 'extraLight',
    'ultra light': 'extraLight',
    'light': 'light',
    'regular': 'normal',
    'normal': 'normal',
    'medium': 'medium',
    'semibold': 'semiBold',
    'semi bold': 'semiBold',
    'bold': 'bold',
    'extrabold': 'extraBold',
    'extra bold': 'extraBold',
    'ultra bold': 'extraBold',
    'black': 'heavy',
    'heavy': 'heavy'
  };
  
  // Detectar estilo
  let style: FontMetadata['style'] = 'normal';
  if (/italic/i.test(nameWithoutExt)) {
    style = 'italic';
  }
  
  // Extrair peso e nome base
  const lowerName = nameWithoutExt.toLowerCase();
  
  for (const [keyword, weightValue] of Object.entries(weightMap)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(lowerName)) {
      weight = weightValue;
      subFamily = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      // Remove o peso do nome base
      baseName = nameWithoutExt.replace(regex, '').trim();
      break;
    }
  }
  
  // Limpar nome base (remover espaços extras, hífens etc.)
  baseName = baseName
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Se não detectou peso específico no nome, manter como está
  if (weight === 'normal' && subFamily === 'Regular') {
    baseName = nameWithoutExt.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  return {
    name: baseName,
    fileName,
    uri: `http://localhost:3000/fonts/${encodeURIComponent(fileName)}`,
    style,
    weight,
    subFamily
  };
}