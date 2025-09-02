#!/usr/bin/env python3
"""
Leitor simples para análise de estrutura PSD
"""

import sys
import os
from psd_tools import PSDImage

def analyze_psd_structure(psd_path):
    """Analisa a estrutura completa do PSD"""
    
    try:
        psd = PSDImage.open(psd_path)
        print(f"[INFO] Arquivo: {os.path.basename(psd_path)}")
        print(f"[INFO] Dimensões: {psd.width} x {psd.height}")
        print(f"[INFO] Modo de cor: {psd.color_mode}")
        
        print(f"\n[LAYERS] Total de layers: {len(list(psd))}")
        
        def print_layer_info(layer, depth=0):
            indent = "  " * depth
            print(f"{indent}Layer: {layer.name}")
            print(f"{indent}   Tipo: {layer.kind}")
            print(f"{indent}   Visivel: {layer.visible}")
            
            if layer.kind == 'type':
                print(f"{indent}   [TEXTO]")
                
                # Mostra texto se disponível
                if hasattr(layer, 'text'):
                    print(f"{indent}   Conteudo: '{layer.text}'")
                
                # Lista todos os atributos relacionados a texto
                text_attrs = []
                for attr in dir(layer):
                    if not attr.startswith('_') and 'text' in attr.lower():
                        text_attrs.append(attr)
                
                if text_attrs:
                    print(f"{indent}   Atributos de texto: {', '.join(text_attrs)}")
                
                # Tenta acessar text_data
                if hasattr(layer, 'text_data') and layer.text_data:
                    print(f"{indent}   Text Data: {type(layer.text_data)}")
                    
                    text_data = layer.text_data
                    
                    # Verifica atributos de text_data
                    td_attrs = [attr for attr in dir(text_data) if not attr.startswith('_')]
                    print(f"{indent}   Text Data atributos: {', '.join(td_attrs[:5])}...")
                    
                    # Verifica document_resources
                    if hasattr(text_data, 'document_resources'):
                        dr = text_data.document_resources
                        print(f"{indent}   Document Resources: {type(dr)}")
                        
                        if hasattr(dr, 'font_set'):
                            font_set = dr.font_set
                            print(f"{indent}   Font Set: {len(font_set) if font_set else 0} fontes")
                            
                            if font_set:
                                for i, font in enumerate(font_set):
                                    font_info = []
                                    for attr in ['name', 'postscript_name', 'family']:
                                        if hasattr(font, attr):
                                            value = getattr(font, attr)
                                            if value:
                                                font_info.append(f"{attr}={value}")
                                    
                                    if font_info:
                                        print(f"{indent}     Fonte {i+1}: {', '.join(font_info)}")
                                    else:
                                        print(f"{indent}     Fonte {i+1}: {type(font)} - {[a for a in dir(font) if not a.startswith('_')][:3]}")
                    
                    # Verifica style_runs  
                    if hasattr(text_data, 'style_runs'):
                        style_runs = text_data.style_runs
                        print(f"{indent}   Style Runs: {len(style_runs) if style_runs else 0}")
                        
                        if style_runs:
                            for i, run in enumerate(style_runs):
                                run_info = []
                                if hasattr(run, 'style'):
                                    style = run.style
                                    for attr in ['font', 'font_name', 'font_family']:
                                        if hasattr(style, attr):
                                            value = getattr(style, attr)
                                            if value:
                                                run_info.append(f"{attr}={value}")
                                
                                if run_info:
                                    print(f"{indent}     Run {i+1}: {', '.join(run_info)}")
                
                # Verifica tagged blocks
                if hasattr(layer, '_record') and layer._record:
                    if hasattr(layer._record, 'tagged_blocks'):
                        tb = layer._record.tagged_blocks
                        print(f"{indent}   Tagged Blocks: {list(tb.keys())}")
                        
                        if 'TySh' in tb:
                            print(f"{indent}   TySh encontrado: {type(tb['TySh'])}")
            
            # Processa sublayers se houver
            if hasattr(layer, 'layers') and layer.layers:
                print(f"{indent}   Sublayers: {len(layer.layers)}")
                for sublayer in layer.layers:
                    print_layer_info(sublayer, depth + 1)
        
        # Itera pelas layers
        for i, layer in enumerate(psd):
            print(f"\n[LAYER {i+1}]")
            print_layer_info(layer)
        
        # Tenta método alternativo de iteração
        print(f"\n[METODO ALTERNATIVO] Usando psd.layers:")
        if hasattr(psd, 'layers'):
            for i, layer in enumerate(psd.layers):
                print(f"Layer alt {i+1}: {layer.name} ({layer.kind})")
        
    except Exception as e:
        print(f"[ERRO] {e}")
        import traceback
        traceback.print_exc()

def main():
    if len(sys.argv) != 2:
        print("Uso: python simple_psd_reader.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    if not os.path.exists(psd_path):
        print(f"Arquivo não encontrado: {psd_path}")
        sys.exit(1)
    
    analyze_psd_structure(psd_path)

if __name__ == "__main__":
    main()