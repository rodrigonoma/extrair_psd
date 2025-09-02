import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const files = data.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhum arquivo enviado' 
      }, { status: 400 });
    }

    const uploadedFiles: string[] = [];
    const errors: string[] = [];
    
    // Garantir que a pasta fonts existe
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    try {
      await mkdir(fontsDir, { recursive: true });
    } catch (e) {
      // Pasta já existe
    }

    for (const file of files) {
      try {
        // Validar tipo de arquivo
        const fileExtension = path.extname(file.name).toLowerCase();
        if (!['.otf', '.ttf', '.woff', '.woff2'].includes(fileExtension)) {
          errors.push(`${file.name}: Tipo de arquivo não suportado`);
          continue;
        }

        // Validar tamanho (máximo 5MB por fonte)
        if (file.size > 5 * 1024 * 1024) {
          errors.push(`${file.name}: Arquivo muito grande (máximo 5MB)`);
          continue;
        }

        // Converter File para Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Caminho do arquivo
        const filePath = path.join(fontsDir, file.name);
        
        // Escrever arquivo
        await writeFile(filePath, buffer);
        uploadedFiles.push(file.name);
        
        console.log(`✅ Font uploaded: ${file.name}`);
        
      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      uploadedFiles,
      errors,
      message: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso`
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      error: `Erro no servidor: ${error.message}`
    }, { status: 500 });
  }
}