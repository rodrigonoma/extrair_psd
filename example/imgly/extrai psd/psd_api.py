#!/usr/bin/env python3
"""
API REST para extração de fontes de PSDs
Integração com frontend Angular
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
import json
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime

# Importa nossa função de extração
import scan_fonts_binary

app = Flask(__name__)
CORS(app)  # Permite requisições do Angular

# Configurações
UPLOAD_FOLDER = tempfile.mkdtemp()
ALLOWED_EXTENSIONS = {'psd', 'psb'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

def allowed_file(filename):
    """Verifica se arquivo é PSD/PSB válido"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check da API"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/analyze-psd', methods=['POST'])
def analyze_psd():
    """
    Endpoint principal: recebe PSD e retorna fontes
    """
    try:
        # Verifica se arquivo foi enviado
        if 'file' not in request.files:
            return jsonify({
                'error': 'Nenhum arquivo enviado',
                'code': 'NO_FILE'
            }), 400
        
        file = request.files['file']
        
        # Verifica se arquivo foi selecionado
        if file.filename == '':
            return jsonify({
                'error': 'Nenhum arquivo selecionado',
                'code': 'EMPTY_FILENAME'
            }), 400
        
        # Verifica extensão
        if not allowed_file(file.filename):
            return jsonify({
                'error': 'Tipo de arquivo não suportado. Use .psd ou .psb',
                'code': 'INVALID_FILE_TYPE'
            }), 400
        
        # Gera nome único para o arquivo
        file_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower()
        temp_filename = f"{file_id}.{file_ext}"
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
        
        # Salva arquivo temporariamente
        file.save(temp_path)
        
        try:
            # Executa análise de fontes
            fonts = scan_fonts_binary.scan_file_for_fonts(temp_path)
            
            # Informações do arquivo
            file_size = os.path.getsize(temp_path)
            
            # Resultado da análise
            result = {
                'success': True,
                'file_info': {
                    'original_name': filename,
                    'file_id': file_id,
                    'size_bytes': file_size,
                    'size_mb': round(file_size / 1024 / 1024, 2)
                },
                'analysis': {
                    'fonts_found': fonts,
                    'total_fonts': len(fonts),
                    'timestamp': datetime.now().isoformat()
                },
                'metadata': {
                    'method': 'binary_scan',
                    'version': '1.0.0'
                }
            }
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({
                'error': f'Erro ao analisar arquivo: {str(e)}',
                'code': 'ANALYSIS_ERROR'
            }), 500
            
        finally:
            # Remove arquivo temporário
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        return jsonify({
            'error': f'Erro interno: {str(e)}',
            'code': 'INTERNAL_ERROR'
        }), 500

@app.route('/api/supported-formats', methods=['GET'])
def supported_formats():
    """Retorna formatos suportados"""
    return jsonify({
        'formats': list(ALLOWED_EXTENSIONS),
        'max_size_mb': MAX_FILE_SIZE / 1024 / 1024,
        'description': 'Formatos de arquivo suportados para análise'
    })

# Serve arquivos estáticos do Angular (se necessário)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_angular(path):
    """Serve o app Angular (se estiver na mesma pasta)"""
    if path != "" and os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    else:
        return send_from_directory('dist', 'index.html')

if __name__ == '__main__':
    print("[INFO] Iniciando API de Extracao de Fontes PSD")
    print(f"[INFO] Pasta de upload temporaria: {UPLOAD_FOLDER}")
    print(f"[INFO] Tamanho maximo: {MAX_FILE_SIZE / 1024 / 1024}MB")
    print(f"[INFO] Formatos suportados: {ALLOWED_EXTENSIONS}")
    print("[INFO] Servidor rodando em: http://localhost:5000")
    print("[INFO] Health check: http://localhost:5000/api/health")
    print("[INFO] Upload endpoint: POST /api/analyze-psd")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )