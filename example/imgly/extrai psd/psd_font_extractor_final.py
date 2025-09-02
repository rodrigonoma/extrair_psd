#!/usr/bin/env python3
"""
Extrator de Fontes PSD - Versão Final
Acessa diretamente o Type Tool Object Setting (TySh) para extrair fontes
"""

import sys
import os
import json
import re
from psd_tools import PSDImage
from psd_tools.constants import Tag

def extract_fonts_from_tysh(layer):
    """Extrai fontes do Type Tool Object Setting (TySh)"""
    fonts_found = []
    
    try:
        if hasattr(layer, '_record') and layer._record:
            if hasattr(layer._record, 'tagged_blocks'):
                # Procura pelo TySh (Type Tool Object Setting)
                for tag_key, tag_data in layer._record.tagged_blocks.items():
                    if tag_key == Tag.TYPE_TOOL_OBJECT_SETTING or str(tag_key) == "b'TySh'":
                        
                        print(f"[DEBUG] Processando TySh da layer '{layer.name}'")
                        
                        # Converte os dados para análise
                        if hasattr(tag_data, 'text_data'):
                            text_data = tag_data.text_data
                            
                            # Método 1: Através de document_resources
                            if hasattr(text_data, 'document_resources'):
                                doc_res = text_data.document_resources
                                if hasattr(doc_res, 'font_set') and doc_res.font_set:
                                    for font in doc_res.font_set:
                                        font_name = None
                                        
                                        # Tenta diferentes atributos de fonte
                                        for attr in ['name', 'postscript_name', 'family', 'font_name']:
                                            if hasattr(font, attr):
                                                value = getattr(font, attr)
                                                if value and isinstance(value, str) and len(value) > 1:
                                                    font_name = value
                                                    break
                                        
                                        if font_name:
                                            fonts_found.append(font_name)
                                            print(f"[OK] Fonte encontrada via document_resources: {font_name}")
                            
                            # Método 2: Através de style_runs
                            if hasattr(text_data, 'style_runs'):
                                for run in text_data.style_runs:
                                    if hasattr(run, 'style'):
                                        style = run.style
                                        font_name = None
                                        
                                        # Tenta diferentes propriedades de estilo
                                        for attr in ['font', 'font_name', 'font_family', 'postscript_name']:
                                            if hasattr(style, attr):
                                                value = getattr(style, attr)
                                                if value and isinstance(value, str) and len(value) > 1:
                                                    font_name = value
                                                    break
                                        
                                        if font_name:
                                            fonts_found.append(font_name)
                                            print(f"[OK] Fonte encontrada via style_runs: {font_name}")
                        
                        # Método 3: Análise raw dos dados
                        raw_data = str(tag_data)
                        
                        # Padrões para encontrar nomes de fontes
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
                                    print(f"[OK] Fonte encontrada via regex: {match}")
                        
                        # Debug: mostra sample dos dados raw
                        sample = raw_data[:200] if len(raw_data) > 200 else raw_data
                        print(f"[DEBUG] Sample dos dados TySh: {sample[:100]}...")
                        
                        break  # Processou o TySh, pode sair do loop
                        
    except Exception as e:
        print(f"[DEBUG] Erro ao processar TySh da layer {layer.name}: {e}")
    
    # Remove duplicatas mantendo ordem
    unique_fonts = []
    for font in fonts_found:
        if font not in unique_fonts:
            unique_fonts.append(font)
    
    return unique_fonts

def clean_font_name(font_name):
    """Limpa e padroniza nome de fonte"""
    if not font_name:
        return None
    
    # Remove caracteres especiais e espaços extras
    cleaned = re.sub(r'[^\w\-\s]', '', font_name).strip()
    
    # Padroniza espaços
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    return cleaned if len(cleaned) > 2 else None

def main():
    if len(sys.argv) != 2:
        print("Uso: python psd_font_extractor_final.py <arquivo.psd>")
        print("Exemplo: python psd_font_extractor_final.py design.psd")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    if not os.path.exists(psd_path):
        print(f"[ERRO] Arquivo nao encontrado: {psd_path}")
        sys.exit(1)
    
    print(f"[INFO] Extraindo fontes de: {os.path.basename(psd_path)}")
    
    try:
        # Abre o arquivo PSD
        psd = PSDImage.open(psd_path)
        print(f"[INFO] Dimensoes: {psd.width} x {psd.height}")
        
        all_fonts = set()
        text_layers_info = []
        
        # Processa cada layer
        for i, layer in enumerate(psd, 1):
            if layer.kind == 'type':
                print(f"\n[LAYER {i}] Processando: '{layer.name}'")
                print(f"[INFO] Texto: '{layer.text}'")
                
                # Extrai fontes desta layer
                layer_fonts = extract_fonts_from_tysh(layer)
                
                # Limpa nomes de fontes
                cleaned_fonts = []
                for font in layer_fonts:
                    cleaned = clean_font_name(font)
                    if cleaned:
                        cleaned_fonts.append(cleaned)
                        all_fonts.add(cleaned)
                
                # Armazena informações da layer
                layer_info = {
                    'layer_name': layer.name,
                    'text_content': layer.text,
                    'fonts_found': cleaned_fonts,
                    'visible': layer.visible
                }
                text_layers_info.append(layer_info)
                
                if cleaned_fonts:
                    print(f"[SUCESSO] Fontes encontradas: {cleaned_fonts}")
                else:
                    print(f"[AVISO] Nenhuma fonte encontrada nesta layer")
        
        # Resultados finais
        print("\n" + "="*60)
        print("RESULTADO FINAL - FONTES EXTRAIDAS")
        print("="*60)
        
        if all_fonts:
            sorted_fonts = sorted(list(all_fonts))
            print(f"[SUCESSO] Total de fontes unicas encontradas: {len(sorted_fonts)}")
            
            for i, font in enumerate(sorted_fonts, 1):
                print(f"  {i}. {font}")
            
            # Salva resultado em arquivo JSON
            result = {
                'source_file': psd_path,
                'psd_info': {
                    'width': psd.width,
                    'height': psd.height,
                    'total_layers': len(list(psd))
                },
                'fonts_extracted': sorted_fonts,
                'total_unique_fonts': len(sorted_fonts),
                'text_layers': text_layers_info,
                'extraction_date': __import__('datetime').datetime.now().isoformat()
            }
            
            # Salva no mesmo diretório do PSD
            output_file = psd_path.replace('.psd', '_fonts_extracted.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            print(f"\n[SALVO] Resultado completo salvo em:")
            print(f"        {output_file}")
            
            # Cria também um arquivo de texto simples
            txt_file = psd_path.replace('.psd', '_fonts_list.txt')
            with open(txt_file, 'w', encoding='utf-8') as f:
                f.write(f"Fontes extraidas de: {os.path.basename(psd_path)}\\n")
                f.write(f"Total: {len(sorted_fonts)} fontes\\n\\n")
                for i, font in enumerate(sorted_fonts, 1):
                    f.write(f"{i}. {font}\\n")
            
            print(f"[SALVO] Lista simples salva em:")
            print(f"        {txt_file}")
            
        else:
            print("[AVISO] Nenhuma fonte foi encontrada no arquivo PSD")
            print("[INFO] Possiveis causas:")
            print("  - O arquivo nao contem layers de texto")
            print("  - As layers de texto estao em formato nao suportado")
            print("  - As fontes estao incorporadas de forma diferente")
    
    except Exception as e:
        print(f"[ERRO] Erro ao processar arquivo: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)