#!/usr/bin/env python3
"""
Extrator de Fontes PSD - Análise Binária
Acessa dados binários do Type Tool Object Setting
"""

import sys
import os
import json
import re
import struct
from psd_tools import PSDImage
from psd_tools.constants import Tag

def extract_fonts_from_binary_tysh(layer):
    """Extrai fontes analisando dados binários do TySh"""
    fonts_found = []
    
    try:
        if hasattr(layer, '_record') and layer._record:
            if hasattr(layer._record, 'tagged_blocks'):
                for tag_key, tag_data in layer._record.tagged_blocks.items():
                    if tag_key == Tag.TYPE_TOOL_OBJECT_SETTING:
                        
                        print(f"[DEBUG] Analisando dados binários de '{layer.name}'")
                        
                        # Tenta acessar dados binários
                        raw_bytes = None
                        
                        if hasattr(tag_data, 'value'):
                            raw_bytes = tag_data.value
                        elif hasattr(tag_data, 'data'):
                            raw_bytes = tag_data.data
                        elif hasattr(tag_data, '_data'):
                            raw_bytes = tag_data._data
                        
                        if raw_bytes and isinstance(raw_bytes, bytes):
                            print(f"[DEBUG] Encontrados {len(raw_bytes)} bytes de dados")
                            
                            # Converte para string legível ignorando erros
                            text_data = raw_bytes.decode('utf-8', errors='ignore')
                            
                            print(f"[DEBUG] Preview dos dados decodificados:")
                            print(f"[DEBUG] {text_data[:200]}...")
                            
                            # Procura por padrões de nomes de fontes
                            font_patterns = [
                                # PostScript names
                                r'([A-Z][a-z]+(?:[A-Z][a-z]*)*-(?:Bold|Italic|Light|Regular|Medium|Black|Thin))',
                                r'([A-Z][a-z]+(?:[A-Z][a-z]*)*(?:-[A-Z][a-z]*)*)',
                                # Common font families
                                r'(Times New Roman|Arial|Helvetica|Courier|Verdana|Georgia|Calibri|Cambria)',
                                # Font family patterns
                                r'FontFamily[\\x00-\\x20]*([A-Za-z][A-Za-z0-9\\s-]*?)(?:[\\x00-\\x20]|$)',
                                r'PostScriptName[\\x00-\\x20]*([A-Za-z][A-Za-z0-9-]*?)(?:[\\x00-\\x20]|$)',
                                # Generic patterns
                                r'([A-Z][a-z]{2,}(?:[A-Z][a-z]+)*)',
                            ]
                            
                            found_in_layer = set()
                            
                            for pattern in font_patterns:
                                matches = re.findall(pattern, text_data)
                                for match in matches:
                                    if isinstance(match, tuple):
                                        match = match[0] if match[0] else match[1] if len(match) > 1 else ''
                                    
                                    match = match.strip()
                                    # Filtra resultados inválidos
                                    if (len(match) > 3 and 
                                        match not in ['Type', 'Text', 'Data', 'Object', 'Layer', 'Block', 'Tagged'] and
                                        not re.match(r'^[0-9]+$', match)):
                                        
                                        found_in_layer.add(match)
                                        print(f"[MATCH] Possível fonte: {match}")
                            
                            fonts_found.extend(list(found_in_layer))
                            
                            # Método alternativo: procura sequências específicas
                            # Procura por null-terminated strings que podem ser fontes
                            strings = re.findall(rb'([A-Za-z][A-Za-z0-9\-]{3,30})\x00', raw_bytes)
                            for string_bytes in strings:
                                try:
                                    string = string_bytes.decode('utf-8')
                                    if (len(string) > 3 and 
                                        any(char.isupper() for char in string) and
                                        string not in ['Type', 'Text', 'Data', 'Object', 'Layer']):
                                        fonts_found.append(string)
                                        print(f"[NULL-TERM] Possível fonte: {string}")
                                except:
                                    continue
                        else:
                            print(f"[DEBUG] Não foi possível acessar dados binários")
                            
                        break
                        
    except Exception as e:
        print(f"[DEBUG] Erro ao processar dados binários: {e}")
    
    # Remove duplicatas
    return list(set(fonts_found))

def extract_from_text_engine_data(layer):
    """Método alternativo usando text_data se disponível"""
    fonts_found = []
    
    try:
        if hasattr(layer, 'text_data') and layer.text_data:
            text_data = layer.text_data
            
            # Método direto via document_resources
            if hasattr(text_data, 'document_resources') and text_data.document_resources:
                doc_res = text_data.document_resources
                
                if hasattr(doc_res, 'font_set') and doc_res.font_set:
                    print(f"[INFO] Encontrado font_set com {len(doc_res.font_set)} fontes")
                    
                    for i, font in enumerate(doc_res.font_set):
                        font_name = None
                        
                        # Lista todos os atributos do objeto font
                        attrs = [attr for attr in dir(font) if not attr.startswith('_')]
                        print(f"[DEBUG] Font {i} attributes: {attrs}")
                        
                        # Tenta diferentes propriedades
                        for attr in ['name', 'postscript_name', 'family_name', 'font_name', 'full_name']:
                            if hasattr(font, attr):
                                value = getattr(font, attr)
                                if value:
                                    print(f"[DEBUG] Font {i}.{attr} = {value}")
                                    if isinstance(value, str) and len(value) > 2:
                                        font_name = value
                                        break
                        
                        if font_name:
                            fonts_found.append(font_name)
                            print(f"[OK] Fonte extraída: {font_name}")
            
            # Método via style_runs
            if hasattr(text_data, 'style_runs') and text_data.style_runs:
                print(f"[INFO] Analisando {len(text_data.style_runs)} style runs")
                
                for i, run in enumerate(text_data.style_runs):
                    if hasattr(run, 'style') and run.style:
                        style = run.style
                        
                        # Lista atributos do style
                        attrs = [attr for attr in dir(style) if not attr.startswith('_')]
                        print(f"[DEBUG] Style {i} attributes: {attrs}")
                        
                        # Procura por propriedades de fonte
                        for attr in attrs:
                            if 'font' in attr.lower():
                                value = getattr(style, attr)
                                if value:
                                    print(f"[DEBUG] Style {i}.{attr} = {value}")
                                    if isinstance(value, str) and len(value) > 2:
                                        fonts_found.append(value)
    
    except Exception as e:
        print(f"[DEBUG] Erro no text_engine_data: {e}")
    
    return fonts_found

def main():
    if len(sys.argv) != 2:
        print("Uso: python psd_font_extractor_binary.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    if not os.path.exists(psd_path):
        print(f"[ERRO] Arquivo não encontrado: {psd_path}")
        sys.exit(1)
    
    print(f"[INFO] Extraindo fontes (análise binária): {os.path.basename(psd_path)}")
    
    try:
        psd = PSDImage.open(psd_path)
        print(f"[INFO] Dimensões: {psd.width} x {psd.height}")
        
        all_fonts = set()
        
        for i, layer in enumerate(psd, 1):
            if layer.kind == 'type':
                print(f"\n[LAYER {i}] Analisando: '{layer.name}'")
                print(f"[INFO] Texto: '{layer.text}'")
                
                # Método 1: Análise binária
                binary_fonts = extract_fonts_from_binary_tysh(layer)
                
                # Método 2: text_data
                engine_fonts = extract_from_text_engine_data(layer)
                
                # Combina resultados
                layer_fonts = set(binary_fonts + engine_fonts)
                all_fonts.update(layer_fonts)
                
                if layer_fonts:
                    print(f"[RESULTADO] Fontes desta layer: {sorted(layer_fonts)}")
                else:
                    print(f"[AVISO] Nenhuma fonte encontrada")
        
        print(f"\n{'='*60}")
        print("FONTES EXTRAÍDAS (ANÁLISE BINÁRIA)")
        print(f"{'='*60}")
        
        if all_fonts:
            # Filtra resultados mais prováveis
            likely_fonts = set()
            for font in all_fonts:
                # Filtra nomes que parecem fontes reais
                if (len(font) > 3 and 
                    not font.lower() in ['type', 'text', 'data', 'object', 'layer', 'block'] and
                    any(c.isupper() for c in font)):
                    likely_fonts.add(font)
            
            if likely_fonts:
                sorted_fonts = sorted(likely_fonts)
                print(f"[SUCESSO] Fontes prováveis encontradas: {len(sorted_fonts)}")
                for i, font in enumerate(sorted_fonts, 1):
                    print(f"  {i}. {font}")
                
                # Salva resultado
                output_file = psd_path.replace('.psd', '_fonts_binary.json')
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        'source_file': psd_path,
                        'extraction_method': 'binary_analysis',
                        'fonts_found': sorted_fonts,
                        'total_fonts': len(sorted_fonts),
                        'all_matches': sorted(all_fonts)  # Inclui todos os matches
                    }, f, indent=2, ensure_ascii=False)
                
                print(f"\n[SALVO] Resultado em: {output_file}")
            else:
                print("[AVISO] Nenhuma fonte provável identificada")
                print(f"[DEBUG] Todos os matches: {sorted(all_fonts)}")
        else:
            print("[AVISO] Nenhum dado de fonte encontrado")
    
    except Exception as e:
        print(f"[ERRO] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()