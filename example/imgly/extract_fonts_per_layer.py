#!/usr/bin/env python3
"""
Extrator de fontes PSD com associação por camada
Combina análise binária com informações de camadas específicas
"""

import sys
import os
import json
import re
from psd_tools import PSDImage
from psd_tools.constants import Tag

def extract_fonts_from_layer_tysh(layer):
    """Extrai fontes específicas de uma camada usando análise do TySh"""
    fonts_found = []
    
    try:
        if hasattr(layer, '_record') and layer._record:
            if hasattr(layer._record, 'tagged_blocks'):
                for tag_key, tag_data in layer._record.tagged_blocks.items():
                    if tag_key == Tag.TYPE_TOOL_OBJECT_SETTING or str(tag_key) == "b'TySh'":
                        
                        print(f"[DEBUG] Analisando TySh da camada '{layer.name}'")
                        
                        # Método 1: Via text_data estruturado
                        if hasattr(tag_data, 'text_data'):
                            text_data = tag_data.text_data
                            
                            # Via document_resources
                            if hasattr(text_data, 'document_resources'):
                                doc_res = text_data.document_resources
                                if hasattr(doc_res, 'font_set') and doc_res.font_set:
                                    for font in doc_res.font_set:
                                        for attr in ['name', 'postscript_name', 'family', 'font_name']:
                                            if hasattr(font, attr):
                                                value = getattr(font, attr)
                                                if value and isinstance(value, str) and len(value) > 1:
                                                    fonts_found.append(value)
                                                    print(f"[MATCH] Fonte via document_resources: {value}")
                                                    break
                            
                            # Via style_runs
                            if hasattr(text_data, 'style_runs'):
                                for run in text_data.style_runs:
                                    if hasattr(run, 'style'):
                                        style = run.style
                                        for attr in ['font', 'font_name', 'font_family', 'postscript_name']:
                                            if hasattr(style, attr):
                                                value = getattr(style, attr)
                                                if value and isinstance(value, str) and len(value) > 1:
                                                    fonts_found.append(value)
                                                    print(f"[MATCH] Fonte via style_runs: {value}")
                                                    break
                        
                        # Método 2: Análise binária dos dados da camada específica
                        raw_data = str(tag_data)
                        
                        # Padrões específicos para fontes
                        font_patterns = [
                            r'PostScriptName["\s]*[:\s]*["\s]*([A-Za-z][A-Za-z0-9\-]*)',
                            r'FontName["\s]*[:\s]*["\s]*([A-Za-z][A-Za-z0-9\-]*)',
                            r'Family["\s]*[:\s]*["\s]*([A-Za-z][A-Za-z0-9\s\-]*)',
                            r'([A-Za-z]+(?:\-[A-Z][a-z]*)*(?:\-(?:Bold|Italic|Light|Regular|Medium|Black|Thin))?)',
                        ]
                        
                        for pattern in font_patterns:
                            matches = re.findall(pattern, raw_data, re.IGNORECASE)
                            for match in matches:
                                match = match.strip()
                                if len(match) > 2 and match not in ['Type', 'Text', 'Object', 'Data', 'Layer']:
                                    fonts_found.append(match)
                                    print(f"[MATCH] Fonte via regex: {match}")
                        
                        # Método 3: Scan binário focado nas palavras-chave de fontes
                        # Converte dados para bytes e aplica método similar ao scan_fonts_binary
                        try:
                            if hasattr(tag_data, 'data'):
                                layer_bytes = tag_data.data
                            elif hasattr(tag_data, '_data'):
                                layer_bytes = tag_data._data
                            else:
                                layer_bytes = str(tag_data).encode('latin-1', errors='ignore')
                            
                            if isinstance(layer_bytes, bytes):
                                # Remove null bytes e decodifica
                                text = layer_bytes.replace(b"\x00", b"").decode("latin-1", errors="ignore")
                                
                                # Procura palavras com indicadores de fonte
                                words = re.findall(r"[A-Za-z0-9][A-Za-z0-9 _\-/]{2,}", text)
                                font_terms = ["Bold", "Light", "Regular", "Italic", "Thin", "Medium", "Black", "Semibold", "Condensed", "Heavy", "Ultra", "Book"]
                                
                                for w in words:
                                    if any(t in w for t in font_terms):
                                        name = w.strip().strip("/")
                                        if name.lower() not in {"fauxbold false", "fauxitalic false"} and 0 < len(name) <= 50:
                                            fonts_found.append(name)
                                            print(f"[MATCH] Fonte via scan binário: {name}")
                        except Exception as e:
                            print(f"[DEBUG] Erro no scan binário: {e}")
                        
                        break
                        
    except Exception as e:
        print(f"[DEBUG] Erro ao processar camada {layer.name}: {e}")
    
    # Remove duplicatas mantendo ordem
    unique_fonts = []
    for font in fonts_found:
        cleaned = clean_font_name(font)
        if cleaned and cleaned not in unique_fonts:
            unique_fonts.append(cleaned)
    
    return unique_fonts

def clean_font_name(font_name):
    """Limpa e padroniza nome de fonte"""
    if not font_name:
        return None
    
    # Remove caracteres especiais e espaços extras
    cleaned = re.sub(r'[^\w\-\s]', '', font_name).strip()
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    return cleaned if len(cleaned) > 2 else None

def extract_fonts_with_layer_association(psd_path):
    """Extrai fontes associando cada uma à sua camada específica"""
    
    if not os.path.exists(psd_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {psd_path}")
    
    print(f"[INFO] Extraindo fontes com associação por camada: {os.path.basename(psd_path)}")
    
    try:
        psd = PSDImage.open(psd_path)
        print(f"[INFO] Dimensões: {psd.width} x {psd.height}")
        
        layers_info = []
        all_unique_fonts = set()
        
        # Processa cada camada de texto
        for i, layer in enumerate(psd, 1):
            if layer.kind == 'type':
                print(f"\n[LAYER {i}] Processando: '{layer.name}'")
                print(f"[INFO] Texto: '{layer.text}'")
                
                # Extrai fontes específicas desta camada
                layer_fonts = extract_fonts_from_layer_tysh(layer)
                
                # Adiciona ao conjunto geral
                for font in layer_fonts:
                    all_unique_fonts.add(font)
                
                # Informações da camada
                layer_info = {
                    'layer_index': i,
                    'layer_name': layer.name,
                    'text_content': layer.text,
                    'fonts_found': layer_fonts,
                    'font_count': len(layer_fonts),
                    'visible': layer.visible,
                    'bbox': {
                        'left': layer.left,
                        'top': layer.top,
                        'right': layer.right,
                        'bottom': layer.bottom
                    } if hasattr(layer, 'left') else None
                }
                
                layers_info.append(layer_info)
                
                if layer_fonts:
                    print(f"[SUCESSO] Fontes da camada '{layer.name}': {layer_fonts}")
                else:
                    print(f"[AVISO] Nenhuma fonte encontrada na camada '{layer.name}'")
        
        # Resultado final
        result = {
            'source_file': psd_path,
            'psd_info': {
                'width': psd.width,
                'height': psd.height,
                'total_layers': len(list(psd))
            },
            'extraction_method': 'layer_specific_analysis',
            'summary': {
                'total_text_layers': len(layers_info),
                'total_unique_fonts': len(all_unique_fonts),
                'all_fonts_found': sorted(list(all_unique_fonts))
            },
            'layers': layers_info,
            'extraction_timestamp': __import__('datetime').datetime.now().isoformat()
        }
        
        return result
        
    except Exception as e:
        raise Exception(f"Erro ao processar PSD: {e}")

def main():
    if len(sys.argv) != 2:
        print("Uso: python extract_fonts_per_layer.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    try:
        result = extract_fonts_with_layer_association(psd_path)
        
        # Imprime resultado formatado
        print(f"\n{'='*60}")
        print("RESULTADO: FONTES POR CAMADA")
        print(f"{'='*60}")
        print(f"Arquivo: {result['source_file']}")
        print(f"Camadas de texto: {result['summary']['total_text_layers']}")
        print(f"Fontes únicas: {result['summary']['total_unique_fonts']}")
        
        for layer in result['layers']:
            print(f"\nCamada '{layer['layer_name']}':")
            print(f"  Texto: '{layer['text_content']}'")
            print(f"  Fontes: {layer['fonts_found'] if layer['fonts_found'] else 'Nenhuma'}")
        
        print(f"\nTodas as fontes encontradas:")
        for font in result['summary']['all_fonts_found']:
            print(f"  - {font}")
        
        # Salva resultado JSON
        output_file = psd_path.replace('.psd', '_fonts_per_layer.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n[SALVO] Resultado detalhado em: {output_file}")
        
        # Retorna JSON para integração com Node.js
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(f"[ERRO] {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()