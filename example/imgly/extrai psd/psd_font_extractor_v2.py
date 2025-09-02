#!/usr/bin/env python3
"""
Aplicação aprimorada para extrair nomes de fontes de arquivos PSD
Versão melhorada com múltiplos métodos de extração
"""

import sys
import os
from pathlib import Path
from psd_tools import PSDImage
from psd_tools.api.layers import TypeLayer
import json
import re

def extract_fonts_method_1(psd):
    """Método 1: Acesso direto via text_data"""
    fonts_found = set()
    
    def process_layer(layer):
        if hasattr(layer, 'kind') and layer.kind == 'type':
            try:
                # Método 1a: Via text_data
                if hasattr(layer, 'text_data') and layer.text_data:
                    if hasattr(layer.text_data, 'style_runs'):
                        for run in layer.text_data.style_runs:
                            if hasattr(run, 'style') and hasattr(run.style, 'font'):
                                fonts_found.add(run.style.font)
                    
                    # Método 1b: Via document_resources
                    if hasattr(layer.text_data, 'document_resources'):
                        doc_res = layer.text_data.document_resources
                        if hasattr(doc_res, 'font_set') and doc_res.font_set:
                            for font in doc_res.font_set:
                                if hasattr(font, 'name'):
                                    fonts_found.add(font.name)
                
                print(f"[DEBUG] Layer '{layer.name}': {layer.text if hasattr(layer, 'text') else 'No text'}")
                
            except Exception as e:
                print(f"[DEBUG] Erro no layer {layer.name}: {e}")
        
        # Processa sublayers
        if hasattr(layer, 'layers'):
            for sublayer in layer.layers:
                process_layer(sublayer)
    
    for layer in psd:
        process_layer(layer)
    
    return fonts_found

def extract_fonts_method_2(psd):
    """Método 2: Análise dos tagged blocks"""
    fonts_found = set()
    
    def analyze_tagged_blocks(layer):
        if hasattr(layer, '_record') and layer._record:
            if hasattr(layer._record, 'tagged_blocks'):
                for block_key, block_data in layer._record.tagged_blocks.items():
                    try:
                        block_str = str(block_data)
                        
                        # Procura padrões de fontes
                        font_patterns = [
                            r'FontSet["\s]*[:\s]*["\s]*([A-Za-z][A-Za-z0-9\-]*)',
                            r'font["\s]*[:\s]*["\s]*([A-Za-z][A-Za-z0-9\-]*)',
                            r'PostScriptName["\s]*[:\s]*["\s]*([A-Za-z][A-Za-z0-9\-]*)',
                            r'([A-Za-z]+(?:\-[A-Za-z]+)*(?:\-(?:Bold|Italic|Light|Regular|Medium|Black|Thin))?)(?=\s|"|\'|$)',
                        ]
                        
                        for pattern in font_patterns:
                            matches = re.findall(pattern, block_str, re.IGNORECASE)
                            for match in matches:
                                if len(match) > 2 and not match.isdigit():
                                    fonts_found.add(match.strip())
                        
                        # Procura por nomes de fontes comuns
                        common_fonts = [
                            'Arial', 'Helvetica', 'Times', 'Courier', 'Verdana', 'Georgia',
                            'Trebuchet', 'Impact', 'Comic Sans', 'Calibri', 'Cambria',
                            'Consolas', 'Tahoma', 'Century', 'Garamond', 'Palatino'
                        ]
                        
                        for font in common_fonts:
                            if font in block_str:
                                fonts_found.add(font)
                                
                    except Exception as e:
                        continue
        
        # Processa sublayers
        if hasattr(layer, 'layers'):
            for sublayer in layer.layers:
                analyze_tagged_blocks(sublayer)
    
    for layer in psd:
        analyze_tagged_blocks(layer)
    
    return fonts_found

def extract_fonts_method_3(psd):
    """Método 3: Análise da estrutura interna do PSD"""
    fonts_found = set()
    
    try:
        # Verifica recursos do documento
        if hasattr(psd, '_record') and psd._record:
            if hasattr(psd._record, 'image_resources'):
                for resource in psd._record.image_resources:
                    resource_str = str(resource)
                    
                    # Procura por informações de fonte nos recursos
                    font_matches = re.findall(r'([A-Za-z]+(?:\-[A-Za-z]+)*)', resource_str)
                    for match in font_matches:
                        if len(match) > 3 and match not in ['data', 'type', 'size', 'color']:
                            fonts_found.add(match)
        
        # Verifica layers resources
        for layer in psd:
            if hasattr(layer, '_record'):
                layer_str = str(layer._record)
                
                # Extrai possíveis nomes de fonte
                potential_fonts = re.findall(r'([A-Z][a-z]+(?:[A-Z][a-z]+)*(?:\-[A-Z][a-z]+)*)', layer_str)
                for font in potential_fonts:
                    if len(font) > 3:
                        fonts_found.add(font)
                        
    except Exception as e:
        print(f"[DEBUG] Erro no método 3: {e}")
    
    return fonts_found

def extract_fonts_method_4(psd):
    """Método 4: Análise raw do conteúdo binário"""
    fonts_found = set()
    
    try:
        # Converte toda estrutura para string e procura padrões
        full_str = str(psd._record) if hasattr(psd, '_record') else str(psd)
        
        # Padrões mais específicos para fontes
        patterns = [
            r'([A-Za-z]+\-(?:Bold|Italic|Light|Regular|Medium|Black|Thin|Heavy|Condensed))',
            r'(Times New Roman|Arial|Helvetica|Courier|Verdana|Georgia|Trebuchet|Impact)',
            r'([A-Z][a-z]+[A-Z][a-z]+(?:\-[A-Z][a-z]+)?)',  # CamelCase fonts
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, full_str)
            for match in matches:
                if isinstance(match, tuple):
                    for m in match:
                        if len(m) > 3:
                            fonts_found.add(m)
                else:
                    if len(match) > 3:
                        fonts_found.add(match)
                        
    except Exception as e:
        print(f"[DEBUG] Erro no método 4: {e}")
    
    return fonts_found

def main():
    if len(sys.argv) != 2:
        print("Uso: python psd_font_extractor_v2.py <arquivo.psd>")
        print("Exemplo: python psd_font_extractor_v2.py design.psd")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    if not os.path.exists(psd_path):
        print(f"[ERRO] Arquivo nao encontrado: {psd_path}")
        sys.exit(1)
    
    print(f"[INFO] Processando: {os.path.basename(psd_path)}")
    
    try:
        psd = PSDImage.open(psd_path)
        print(f"[INFO] Dimensoes: {psd.width}x{psd.height}")
        
        # Lista layers
        print(f"[INFO] Layers encontradas:")
        for i, layer in enumerate(psd):
            print(f"   {i+1}. {layer.name} (Tipo: {layer.kind})")
        
        print("\n[INFO] Executando múltiplos métodos de extração...")
        
        # Executa todos os métodos
        fonts_1 = extract_fonts_method_1(psd)
        fonts_2 = extract_fonts_method_2(psd)
        fonts_3 = extract_fonts_method_3(psd)
        fonts_4 = extract_fonts_method_4(psd)
        
        # Combina todos os resultados
        all_fonts = set()
        all_fonts.update(fonts_1)
        all_fonts.update(fonts_2)
        all_fonts.update(fonts_3)
        all_fonts.update(fonts_4)
        
        print("\n" + "="*60)
        print("[RESULTADOS DETALHADOS]")
        print("="*60)
        
        if fonts_1:
            print(f"[METODO 1] Text Data: {sorted(fonts_1)}")
        if fonts_2:
            print(f"[METODO 2] Tagged Blocks: {sorted(fonts_2)}")
        if fonts_3:
            print(f"[METODO 3] Estrutura PSD: {sorted(fonts_3)}")
        if fonts_4:
            print(f"[METODO 4] Analise Raw: {sorted(fonts_4)}")
        
        if all_fonts:
            print(f"\n[TOTAL] FONTES UNICAS ENCONTRADAS: {len(all_fonts)}")
            for i, font in enumerate(sorted(all_fonts), 1):
                print(f"   {i}. {font}")
            
            # Salva resultado
            output_file = psd_path.replace('.psd', '_fonts_v2.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'source_file': psd_path,
                    'extraction_methods': {
                        'method_1_text_data': list(fonts_1),
                        'method_2_tagged_blocks': list(fonts_2),
                        'method_3_psd_structure': list(fonts_3),
                        'method_4_raw_analysis': list(fonts_4)
                    },
                    'all_fonts_found': sorted(list(all_fonts)),
                    'total_fonts': len(all_fonts)
                }, f, indent=2, ensure_ascii=False)
            
            print(f"\n[SALVO] Resultado detalhado em: {output_file}")
        else:
            print("\n[AVISO] Nenhuma fonte foi encontrada com os métodos disponíveis")
            print("[INFO] Isso pode acontecer se:")
            print("   - O PSD não contém layers de texto")
            print("   - As fontes estão em formato não suportado")
            print("   - O arquivo PSD tem estrutura muito antiga/nova")
            
    except Exception as e:
        print(f"[ERRO] Erro ao processar arquivo: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()