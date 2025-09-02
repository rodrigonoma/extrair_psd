#!/usr/bin/env python3
"""
Processador de PSD com suporte a grupos de layers
Especialmente para PSDs com estrutura hierárquica
"""

import sys
import os
import json
from psd_tools import PSDImage

def process_layer_recursive(layer, depth=0, path=""):
    """Processa layer recursivamente, incluindo grupos"""
    indent = "  " * depth
    current_path = f"{path}/{layer.name}" if path else layer.name
    
    results = {
        'name': layer.name,
        'kind': layer.kind,
        'visible': layer.visible,
        'path': current_path,
        'text_layers': [],
        'sublayers': []
    }
    
    print(f"{indent}Layer: {layer.name} ({layer.kind})")
    
    # Se é layer de texto
    if layer.kind == 'type':
        print(f"{indent}  [TEXTO] '{getattr(layer, 'text', 'N/A')}'")
        
        text_info = {
            'name': layer.name,
            'path': current_path,
            'text': getattr(layer, 'text', ''),
            'visible': layer.visible,
            'fonts_found': []
        }
        
        # Tenta extrair informações de fonte
        if hasattr(layer, 'text_data') and layer.text_data:
            text_data = layer.text_data
            
            # Via document_resources
            if (hasattr(text_data, 'document_resources') and 
                text_data.document_resources and
                hasattr(text_data.document_resources, 'font_set') and
                text_data.document_resources.font_set):
                
                for font in text_data.document_resources.font_set:
                    for attr in ['name', 'postscript_name', 'family_name', 'font_name']:
                        if hasattr(font, attr):
                            value = getattr(font, attr)
                            if value and isinstance(value, str):
                                text_info['fonts_found'].append(value)
                                print(f"{indent}    Font: {value}")
            
            # Via style_runs
            if hasattr(text_data, 'style_runs') and text_data.style_runs:
                for run in text_data.style_runs:
                    if hasattr(run, 'style') and run.style:
                        for attr in ['font', 'font_name', 'font_family']:
                            if hasattr(run.style, attr):
                                value = getattr(run.style, attr)
                                if value and isinstance(value, str):
                                    text_info['fonts_found'].append(value)
                                    print(f"{indent}    Font: {value}")
        
        results['text_layers'].append(text_info)
    
    # Se é grupo, processa sublayers
    elif layer.kind == 'group' and hasattr(layer, 'layers'):
        print(f"{indent}  [GRUPO] {len(layer.layers)} sublayers")
        for sublayer in layer.layers:
            sublayer_result = process_layer_recursive(sublayer, depth + 1, current_path)
            results['sublayers'].append(sublayer_result)
            # Propaga text_layers para cima
            results['text_layers'].extend(sublayer_result['text_layers'])
    
    return results

def extract_from_psdtxtractor_output(psd_path):
    """Extrai dados do psdtxtractor para comparação"""
    import subprocess
    
    try:
        result = subprocess.run(['psdtxtractor', psd_path], 
                              capture_output=True, text=True, 
                              encoding='utf-8', shell=True)
        
        if result.stdout:
            return result.stdout
    except:
        pass
    
    return None

def main():
    if len(sys.argv) != 2:
        print("Uso: python psd_group_processor.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    if not os.path.exists(psd_path):
        print(f"[ERRO] Arquivo não encontrado: {psd_path}")
        sys.exit(1)
    
    print(f"[INFO] Processando PSD com grupos: {os.path.basename(psd_path)}")
    
    try:
        psd = PSDImage.open(psd_path)
        print(f"[INFO] Dimensões: {psd.width} x {psd.height}")
        print(f"[INFO] Total de layers principais: {len(list(psd))}")
        
        all_text_layers = []
        all_fonts = set()
        
        print(f"\n{'='*60}")
        print("ESTRUTURA HIERÁRQUICA DO PSD")
        print(f"{'='*60}")
        
        # Processa cada layer principal
        for i, layer in enumerate(psd, 1):
            print(f"\n[LAYER PRINCIPAL {i}]")
            layer_result = process_layer_recursive(layer)
            
            # Coleta todas as text layers encontradas
            all_text_layers.extend(layer_result['text_layers'])
            
            # Coleta todas as fontes
            for text_layer in layer_result['text_layers']:
                all_fonts.update(text_layer['fonts_found'])
        
        print(f"\n{'='*60}")
        print("RESUMO - LAYERS DE TEXTO ENCONTRADAS")
        print(f"{'='*60}")
        
        if all_text_layers:
            print(f"[OK] Total de layers de texto: {len(all_text_layers)}")
            
            for i, text_layer in enumerate(all_text_layers, 1):
                print(f"\n{i}. {text_layer['path']}")
                print(f"   Texto: '{text_layer['text']}'")
                print(f"   Visível: {text_layer['visible']}")
                if text_layer['fonts_found']:
                    print(f"   Fontes: {', '.join(set(text_layer['fonts_found']))}")
                else:
                    print(f"   Fontes: Não detectadas")
        else:
            print("[AVISO] Nenhuma layer de texto encontrada via psd-tools")
        
        # Compara com psdtxtractor
        print(f"\n{'='*60}")
        print("COMPARAÇÃO COM PSDTXTRACTOR")
        print(f"{'='*60}")
        
        psdtxt_output = extract_from_psdtxtractor_output(psd_path)
        if psdtxt_output:
            print("[OK] Output do psdtxtractor:")
            print(psdtxt_output)
        else:
            print("[AVISO] psdtxtractor não disponível")
        
        # Resultado final
        print(f"\n{'='*60}")
        print("RESULTADO FINAL")
        print(f"{'='*60}")
        
        if all_fonts:
            unique_fonts = sorted(list(all_fonts))
            print(f"[SUCESSO] Fontes extraídas: {len(unique_fonts)}")
            for i, font in enumerate(unique_fonts, 1):
                print(f"  {i}. {font}")
        else:
            print("[AVISO] Nenhuma fonte foi extraída")
            print("[INFO] Possíveis causas:")
            print("  - Fontes incorporadas no PSD")
            print("  - Layers de texto em formato especial")
            print("  - PSD com estrutura não padrão")
        
        # Salva resultado detalhado
        output_data = {
            'source_file': psd_path,
            'psd_info': {
                'width': psd.width,
                'height': psd.height,
                'layers_count': len(list(psd))
            },
            'text_layers_found': all_text_layers,
            'fonts_extracted': sorted(list(all_fonts)),
            'total_fonts': len(all_fonts),
            'psdtxtractor_output': psdtxt_output
        }
        
        output_file = psd_path.replace('.psd', '_groups_analysis.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n[SALVO] Análise completa em: {output_file}")
        
    except Exception as e:
        print(f"[ERRO] Erro ao processar: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()