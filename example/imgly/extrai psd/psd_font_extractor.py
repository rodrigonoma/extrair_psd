#!/usr/bin/env python3
"""
Aplicação para extrair nomes de fontes de arquivos PSD
Usando psd-tools para processar arquivos PSD
"""

import sys
import os
from pathlib import Path
from psd_tools import PSDImage
from psd_tools.api.layers import TypeLayer
import json

def extract_fonts_from_psd(psd_path):
    """
    Extrai todos os nomes de fontes únicas de um arquivo PSD
    
    Args:
        psd_path (str): Caminho para o arquivo PSD
        
    Returns:
        dict: Dicionário com informações das fontes encontradas
    """
    try:
        # Carrega o arquivo PSD
        psd = PSDImage.open(psd_path)
        
        fonts_info = {
            'file': psd_path,
            'fonts': [],
            'text_layers': []
        }
        
        fonts_set = set()
        
        def process_layer(layer, depth=0):
            """Processa uma layer recursivamente"""
            indent = "  " * depth
            
            if hasattr(layer, 'kind') and layer.kind == 'type':
                # É uma layer de texto
                layer_info = {
                    'name': layer.name,
                    'text': getattr(layer, 'text', ''),
                    'fonts': []
                }
                
                try:
                    # Tenta acessar informações de fonte através do engine data
                    if hasattr(layer, '_tagged_blocks') and 'TySh' in layer._tagged_blocks:
                        # Acessa dados do engine do texto
                        engine_data = layer._tagged_blocks['TySh']
                        layer_info['raw_engine_data'] = str(engine_data)
                        
                        # Procura por informações de fonte no engine data
                        engine_str = str(engine_data)
                        if 'FontSet' in engine_str or 'font' in engine_str.lower():
                            layer_info['has_font_data'] = True
                    
                    # Tenta acessar propriedades de texto diretamente
                    if hasattr(layer, 'text_data'):
                        text_data = layer.text_data
                        if text_data and hasattr(text_data, 'style_runs'):
                            for run in text_data.style_runs:
                                if hasattr(run, 'style') and hasattr(run.style, 'font'):
                                    font_name = run.style.font
                                    fonts_set.add(font_name)
                                    layer_info['fonts'].append(font_name)
                    
                    # Método alternativo: verificar se layer tem engine data
                    if hasattr(layer, 'engine_data'):
                        engine_data = layer.engine_data
                        if engine_data:
                            layer_info['engine_data_available'] = True
                            
                except Exception as e:
                    layer_info['error'] = str(e)
                
                fonts_info['text_layers'].append(layer_info)
                print(f"{indent}[TEXT] Text Layer: {layer.name}")
                if layer_info.get('fonts'):
                    for font in layer_info['fonts']:
                        print(f"{indent}   [FONT] Font: {font}")
                
            # Processa sub-layers se existirem
            if hasattr(layer, 'layers') and layer.layers:
                for sublayer in layer.layers:
                    process_layer(sublayer, depth + 1)
        
        print(f"[INFO] Processando: {os.path.basename(psd_path)}")
        print(f"[INFO] Dimensoes: {psd.width}x{psd.height}")
        
        # Processa todas as layers
        for layer in psd:
            process_layer(layer)
        
        # Converte set para lista
        fonts_info['fonts'] = list(fonts_set)
        
        return fonts_info
        
    except Exception as e:
        print(f"[ERRO] Erro ao processar {psd_path}: {e}")
        return None

def extract_fonts_advanced_method(psd_path):
    """
    Método avançado usando acesso direto aos tagged blocks
    """
    try:
        psd = PSDImage.open(psd_path)
        fonts_found = set()
        
        def extract_from_layer(layer):
            if hasattr(layer, '_record') and layer._record:
                # Procura por blocos tagged relacionados a texto
                if hasattr(layer._record, 'tagged_blocks'):
                    for block_key, block_data in layer._record.tagged_blocks.items():
                        if block_key in ['TySh', 'tySh']:  # Text engine shape
                            try:
                                # Converte para string e procura por padrões de fonte
                                block_str = str(block_data)
                                
                                # Procura por padrões comuns de nome de fonte
                                import re
                                font_patterns = [
                                    r'FontSet["\']?\s*:\s*["\']?([^"\';\s]+)',
                                    r'font["\']?\s*:\s*["\']?([^"\';\s]+)',
                                    r'([A-Za-z]+(?:\-[A-Za-z]+)*(?:\-(?:Bold|Italic|Light|Regular))?)'
                                ]
                                
                                for pattern in font_patterns:
                                    matches = re.findall(pattern, block_str)
                                    for match in matches:
                                        if len(match) > 2 and not match.isdigit():
                                            fonts_found.add(match)
                                            
                            except Exception as e:
                                print(f"[AVISO] Erro ao processar block {block_key}: {e}")
            
            # Processa sub-layers
            if hasattr(layer, 'layers'):
                for sublayer in layer.layers:
                    extract_from_layer(sublayer)
        
        # Processa todas as layers
        for layer in psd:
            extract_from_layer(layer)
            
        return list(fonts_found)
        
    except Exception as e:
        print(f"[ERRO] Erro no metodo avancado: {e}")
        return []

def main():
    if len(sys.argv) != 2:
        print("Uso: python psd_font_extractor.py <arquivo.psd>")
        print("Exemplo: python psd_font_extractor.py design.psd")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    if not os.path.exists(psd_path):
        print(f"[ERRO] Arquivo nao encontrado: {psd_path}")
        sys.exit(1)
    
    if not psd_path.lower().endswith('.psd'):
        print("[AVISO] Aviso: Arquivo nao tem extensao .psd")
    
    print("[INFO] Iniciando extracao de fontes...\n")
    
    # Método principal
    result = extract_fonts_from_psd(psd_path)
    
    # Método avançado como backup
    fonts_advanced = extract_fonts_advanced_method(psd_path)
    
    print("\n" + "="*50)
    print("[RESULTADOS]")
    print("="*50)
    
    if result and result['fonts']:
        print(f"[OK] Fontes encontradas ({len(result['fonts'])}):")
        for i, font in enumerate(result['fonts'], 1):
            print(f"   {i}. {font}")
    else:
        print("[AVISO] Nenhuma fonte encontrada pelo metodo principal")
    
    if fonts_advanced:
        print(f"\n[AVANCADO] Metodo avancado encontrou ({len(fonts_advanced)}):")
        for i, font in enumerate(fonts_advanced, 1):
            print(f"   {i}. {font}")
    
    # Combina resultados
    all_fonts = set()
    if result and result['fonts']:
        all_fonts.update(result['fonts'])
    if fonts_advanced:
        all_fonts.update(fonts_advanced)
    
    if all_fonts:
        print(f"\n[TOTAL] FONTES UNICAS ENCONTRADAS: {len(all_fonts)}")
        
        # Salva resultado em JSON
        output_file = psd_path.replace('.psd', '_fonts.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'source_file': psd_path,
                'fonts_found': list(all_fonts),
                'total_fonts': len(all_fonts),
                'text_layers_info': result['text_layers'] if result else []
            }, f, indent=2, ensure_ascii=False)
        
        print(f"[SALVO] Resultado salvo em: {output_file}")
    else:
        print("[ERRO] Nenhuma fonte foi encontrada no arquivo PSD")

if __name__ == "__main__":
    main()