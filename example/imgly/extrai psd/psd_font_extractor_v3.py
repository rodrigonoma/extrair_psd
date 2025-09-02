#!/usr/bin/env python3
"""
Aplicação especializada para extrair fontes de PSD
Versão 3 - Foco em dados de engine do Photoshop
"""

import sys
import os
import json
from psd_tools import PSDImage
import struct

def extract_engine_data(layer):
    """Extrai dados do engine de texto de uma layer"""
    fonts_found = []
    
    try:
        if hasattr(layer, '_record') and layer._record:
            # Procura por dados de texto no registro da layer
            if hasattr(layer._record, 'tagged_blocks'):
                for key, data in layer._record.tagged_blocks.items():
                    if key in ['TySh', 'tySh']:  # Text Shape
                        try:
                            # Tenta extrair dados do engine
                            raw_data = data
                            data_str = str(raw_data)
                            
                            print(f"[DEBUG] Engine data para layer '{layer.name}':")
                            print(f"[DEBUG] Tamanho dos dados: {len(data_str)} chars")
                            
                            # Procura por strings que podem ser nomes de fontes
                            import re
                            
                            # Padrões mais específicos para fontes do Photoshop
                            font_patterns = [
                                rb'([A-Za-z][A-Za-z0-9\-]+(?:\-(?:Bold|Italic|Light|Regular|Medium|Black|Thin|Heavy))?)',
                                rb'PostScriptName\x00(.{1,50}?)\x00',
                                rb'FontFamily\x00(.{1,50}?)\x00',
                                rb'Name\x00(.{1,50}?)\x00'
                            ]
                            
                            # Se os dados são bytes, procura diretamente
                            if hasattr(raw_data, 'value') and isinstance(raw_data.value, bytes):
                                raw_bytes = raw_data.value
                                
                                for pattern in font_patterns:
                                    matches = re.findall(pattern, raw_bytes)
                                    for match in matches:
                                        try:
                                            if isinstance(match, bytes):
                                                decoded = match.decode('utf-8', errors='ignore').strip()
                                                if decoded and len(decoded) > 2:
                                                    fonts_found.append(decoded)
                                        except:
                                            continue
                            
                            # Método alternativo: busca por strings no texto
                            potential_fonts = re.findall(r'([A-Z][a-zA-Z]+(?:\-[A-Z][a-zA-Z]+)*)', data_str)
                            for font in potential_fonts:
                                if len(font) > 3 and font not in ['Type', 'Text', 'Layer', 'Object', 'Data']:
                                    fonts_found.append(font)
                                    
                        except Exception as e:
                            print(f"[DEBUG] Erro ao processar engine data: {e}")
                            continue
                            
    except Exception as e:
        print(f"[DEBUG] Erro ao acessar dados da layer: {e}")
    
    return list(set(fonts_found))  # Remove duplicatas

def extract_text_properties(layer):
    """Extrai propriedades específicas de texto"""
    properties = {}
    
    try:
        if hasattr(layer, 'text'):
            properties['text_content'] = layer.text
        
        if hasattr(layer, 'text_data') and layer.text_data:
            text_data = layer.text_data
            
            # Verifica style runs
            if hasattr(text_data, 'style_runs'):
                properties['style_runs'] = []
                for i, run in enumerate(text_data.style_runs):
                    run_info = {'index': i}
                    
                    if hasattr(run, 'style'):
                        style = run.style
                        
                        # Tenta extrair propriedades do estilo
                        for attr in ['font', 'font_name', 'font_family', 'postscript_name']:
                            if hasattr(style, attr):
                                run_info[attr] = getattr(style, attr)
                        
                        # Outras propriedades de texto
                        for attr in ['font_size', 'leading', 'tracking', 'color']:
                            if hasattr(style, attr):
                                run_info[attr] = str(getattr(style, attr))
                    
                    properties['style_runs'].append(run_info)
            
            # Verifica font set
            if hasattr(text_data, 'font_set'):
                properties['font_set'] = []
                for font in text_data.font_set:
                    font_info = {}
                    for attr in ['name', 'postscript_name', 'family', 'style']:
                        if hasattr(font, attr):
                            font_info[attr] = getattr(font, attr)
                    properties['font_set'].append(font_info)
        
    except Exception as e:
        print(f"[DEBUG] Erro ao extrair propriedades de texto: {e}")
    
    return properties

def dump_layer_structure(layer, depth=0):
    """Debug: mostra estrutura completa da layer"""
    indent = "  " * depth
    print(f"{indent}Layer: {layer.name} ({layer.kind})")
    
    if layer.kind == 'type':
        # Mostra todos os atributos disponíveis
        attrs = [attr for attr in dir(layer) if not attr.startswith('_')]
        print(f"{indent}  Atributos: {', '.join(attrs[:10])}...")
        
        # Informações específicas de texto
        if hasattr(layer, 'text'):
            print(f"{indent}  Texto: '{layer.text}'")
        
        if hasattr(layer, 'text_data'):
            print(f"{indent}  Text Data: {type(layer.text_data)}")
    
    # Processa sublayers
    if hasattr(layer, 'layers'):
        for sublayer in layer.layers:
            dump_layer_structure(sublayer, depth + 1)

def main():
    if len(sys.argv) != 2:
        print("Uso: python psd_font_extractor_v3.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    if not os.path.exists(psd_path):
        print(f"[ERRO] Arquivo nao encontrado: {psd_path}")
        sys.exit(1)
    
    print(f"[INFO] Analisando arquivo: {os.path.basename(psd_path)}")
    
    try:
        psd = PSDImage.open(psd_path)
        print(f"[INFO] Dimensoes: {psd.width}x{psd.height}")
        
        all_fonts = set()
        layer_details = []
        
        print("\n[DEBUG] Estrutura das layers:")
        dump_layer_structure(psd)
        
        print("\n[INFO] Processando layers de texto...")
        
        for layer in psd:
            if layer.kind == 'type':
                print(f"\n[INFO] Processando layer de texto: '{layer.name}'")
                
                # Extrai fontes do engine data
                engine_fonts = extract_engine_data(layer)
                
                # Extrai propriedades de texto
                text_props = extract_text_properties(layer)
                
                layer_info = {
                    'name': layer.name,
                    'text': getattr(layer, 'text', ''),
                    'fonts_from_engine': engine_fonts,
                    'text_properties': text_props
                }
                
                layer_details.append(layer_info)
                
                # Adiciona fontes encontradas
                all_fonts.update(engine_fonts)
                
                if engine_fonts:
                    print(f"[OK] Fontes encontradas: {engine_fonts}")
                else:
                    print(f"[AVISO] Nenhuma fonte encontrada para layer '{layer.name}'")
        
        print("\n" + "="*60)
        print("[RESULTADO FINAL]")
        print("="*60)
        
        if all_fonts:
            print(f"[SUCESSO] Total de fontes unicas: {len(all_fonts)}")
            for i, font in enumerate(sorted(all_fonts), 1):
                print(f"   {i}. {font}")
        else:
            print("[AVISO] Nenhuma fonte foi extraida do arquivo PSD")
        
        # Salva resultado detalhado
        result = {
            'source_file': psd_path,
            'psd_info': {
                'width': psd.width,
                'height': psd.height,
                'layers_count': len(list(psd))
            },
            'fonts_found': sorted(list(all_fonts)),
            'total_fonts': len(all_fonts),
            'layer_details': layer_details
        }
        
        output_file = psd_path.replace('.psd', '_fonts_v3.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n[SALVO] Resultado detalhado em: {output_file}")
        
    except Exception as e:
        print(f"[ERRO] Erro ao processar arquivo: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()