import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fontPath = resolvedParams.path.join('/');
    console.log('🔤 Font request for:', fontPath);

    // List of possible font directories to search
    const possibleDirs = [
      join(process.cwd(), 'public', 'fonts'),
      join(process.cwd(), 'fonts'),
      join(process.cwd(), 'src', 'fonts'),
    ];

    let fontFile = null;
    let actualPath = null;

    // Try each directory until we find the font
    for (const dir of possibleDirs) {
      const fullPath = join(dir, fontPath);
      console.log('🔍 Checking:', fullPath);
      
      if (existsSync(fullPath)) {
        actualPath = fullPath;
        fontFile = await readFile(fullPath);
        console.log('✅ Found font at:', fullPath);
        break;
      }
    }

    if (!fontFile) {
      console.log('❌ Font not found:', fontPath);
      return new NextResponse('Font not found', { status: 404 });
    }

    // Determine MIME type based on extension
    const extension = fontPath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'woff':
        contentType = 'font/woff';
        break;
      case 'woff2':
        contentType = 'font/woff2';
        break;
      case 'ttf':
        contentType = 'font/ttf';
        break;
      case 'otf':
        contentType = 'font/otf';
        break;
      case 'eot':
        contentType = 'application/vnd.ms-fontobject';
        break;
    }

    console.log('✅ Serving font with content type:', contentType);

    return new NextResponse(fontFile, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=31536000', // 1 year
      },
    });
  } catch (error) {
    console.error('❌ Error serving font:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}