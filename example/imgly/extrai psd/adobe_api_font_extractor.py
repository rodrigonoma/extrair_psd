#!/usr/bin/env python3
"""
Extrator de Fontes PSD usando Adobe Photoshop API
Implementação com OAuth Server-to-Server
"""

import sys
import os
import json
import requests
import base64
from datetime import datetime
import urllib.parse

class AdobePhotoshopAPI:
    def __init__(self, client_id, client_secret, org_id):
        """
        Inicializa cliente da Adobe Photoshop API
        
        Args:
            client_id: Client ID do Adobe Developer Console
            client_secret: Client Secret do Adobe Developer Console  
            org_id: Organization ID do Adobe Developer Console
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.org_id = org_id
        self.access_token = None
        self.base_url = "https://image.adobe.io"
        
    def authenticate(self):
        """Autentica usando OAuth Server-to-Server"""
        try:
            # Endpoint de autenticação Adobe IMS
            auth_url = "https://ims-na1.adobelogin.com/ims/token/v3"
            
            # Dados da requisição
            auth_data = {
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': 'AdobeID,openid,read_organizations,additional_info.projectedProductContext'
            }
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            print("[INFO] Autenticando com Adobe IMS...")
            response = requests.post(auth_url, data=auth_data, headers=headers)
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                print("[OK] Autenticação bem-sucedida!")
                return True
            else:
                print(f"[ERRO] Falha na autenticação: {response.status_code}")
                print(f"[ERRO] Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[ERRO] Erro na autenticação: {e}")
            return False
    
    def upload_psd_to_storage(self, psd_path):
        """
        Upload do PSD para Adobe Creative SDK Storage
        (Simplificado - na prática você precisaria de um storage externo)
        """
        # Para usar a API, o arquivo precisa estar em uma URL acessível
        # Aqui retornamos um placeholder - você precisaria fazer upload para:
        # - Adobe Creative SDK Storage
        # - Amazon S3
        # - Google Cloud Storage
        # - Outro serviço de storage com URL pública
        
        print(f"[AVISO] Para usar a Adobe API, o arquivo PSD precisa estar em uma URL pública")
        print(f"[INFO] Você precisará fazer upload de '{psd_path}' para um serviço de storage")
        
        # Retorna URL de exemplo - substitua pela URL real após upload
        return f"https://exemplo.com/storage/{os.path.basename(psd_path)}"
    
    def get_document_manifest(self, psd_url):
        """
        Obtém o manifesto do documento PSD (estrutura de layers)
        """
        if not self.access_token:
            print("[ERRO] Token de acesso não disponível")
            return None
        
        try:
            manifest_url = f"{self.base_url}/pie/psdService/documentManifest"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'x-api-key': self.client_id,
                'x-gw-ims-org-id': self.org_id,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'inputs': [
                    {
                        'href': psd_url,
                        'storage': 'external'
                    }
                ]
            }
            
            print("[INFO] Solicitando manifesto do documento...")
            response = requests.post(manifest_url, json=payload, headers=headers)
            
            if response.status_code == 202:
                # API retorna 202 para processamento assíncrono
                result = response.json()
                print("[OK] Requisição aceita para processamento")
                return result
            else:
                print(f"[ERRO] Erro ao obter manifesto: {response.status_code}")
                print(f"[ERRO] Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"[ERRO] Erro na requisição do manifesto: {e}")
            return None
    
    def extract_text_layers(self, psd_url):
        """
        Extrai informações de layers de texto usando Adobe API
        """
        if not self.access_token:
            print("[ERRO] Token de acesso não disponível")
            return None
        
        try:
            # Endpoint para análise de texto (exemplo conceitual)
            text_analysis_url = f"{self.base_url}/pie/psdService/text"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'x-api-key': self.client_id,
                'x-gw-ims-org-id': self.org_id,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'inputs': [
                    {
                        'href': psd_url,
                        'storage': 'external'
                    }
                ],
                'options': {
                    'extractFonts': True,
                    'extractTextProperties': True
                }
            }
            
            print("[INFO] Extraindo informações de texto...")
            response = requests.post(text_analysis_url, json=payload, headers=headers)
            
            if response.status_code in [200, 202]:
                result = response.json()
                print("[OK] Extração de texto solicitada")
                return result
            else:
                print(f"[ERRO] Erro na extração de texto: {response.status_code}")
                print(f"[ERRO] Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"[ERRO] Erro na extração de texto: {e}")
            return None

def setup_adobe_credentials():
    """
    Configuração das credenciais Adobe
    """
    print("="*60)
    print("CONFIGURAÇÃO DA ADOBE PHOTOSHOP API")
    print("="*60)
    print()
    print("Para usar a Adobe Photoshop API, você precisa:")
    print("1. Criar uma conta no Adobe Developer Console")
    print("2. Criar um novo projeto")
    print("3. Adicionar a API do Photoshop")
    print("4. Configurar OAuth Server-to-Server")
    print()
    print("Link: https://developer.adobe.com/developer-console/")
    print()
    
    # Verificar se já existem credenciais salvas
    cred_file = "adobe_credentials.json"
    
    if os.path.exists(cred_file):
        try:
            with open(cred_file, 'r') as f:
                creds = json.load(f)
            
            print(f"[INFO] Credenciais encontradas em {cred_file}")
            use_saved = input("Usar credenciais salvas? (s/n): ").lower().strip()
            
            if use_saved in ['s', 'sim', 'y', 'yes']:
                return creds['client_id'], creds['client_secret'], creds['org_id']
        except:
            pass
    
    # Solicitar credenciais
    print("\nDigite suas credenciais do Adobe Developer Console:")
    client_id = input("Client ID: ").strip()
    client_secret = input("Client Secret: ").strip()
    org_id = input("Organization ID: ").strip()
    
    if client_id and client_secret and org_id:
        # Salvar credenciais
        save_creds = input("\nSalvar credenciais para uso futuro? (s/n): ").lower().strip()
        if save_creds in ['s', 'sim', 'y', 'yes']:
            try:
                with open(cred_file, 'w') as f:
                    json.dump({
                        'client_id': client_id,
                        'client_secret': client_secret,
                        'org_id': org_id
                    }, f, indent=2)
                print(f"[INFO] Credenciais salvas em {cred_file}")
            except Exception as e:
                print(f"[AVISO] Erro ao salvar credenciais: {e}")
        
        return client_id, client_secret, org_id
    else:
        print("[ERRO] Credenciais incompletas")
        return None, None, None

def main():
    if len(sys.argv) != 2:
        print("Uso: python adobe_api_font_extractor.py <arquivo.psd>")
        print("Exemplo: python adobe_api_font_extractor.py design.psd")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    if not os.path.exists(psd_path):
        print(f"[ERRO] Arquivo não encontrado: {psd_path}")
        sys.exit(1)
    
    # Configurar credenciais
    client_id, client_secret, org_id = setup_adobe_credentials()
    
    if not all([client_id, client_secret, org_id]):
        print("[ERRO] Credenciais Adobe necessárias")
        sys.exit(1)
    
    # Inicializar API
    api = AdobePhotoshopAPI(client_id, client_secret, org_id)
    
    # Autenticar
    if not api.authenticate():
        print("[ERRO] Falha na autenticação")
        sys.exit(1)
    
    # Instruções para upload
    print(f"\n{'='*60}")
    print("PRÓXIMOS PASSOS PARA USAR A ADOBE API")
    print(f"{'='*60}")
    print()
    print("1. Faça upload do seu PSD para um storage público:")
    print("   - Amazon S3")
    print("   - Google Cloud Storage") 
    print("   - Adobe Creative SDK Storage")
    print("   - Qualquer CDN com URL pública")
    print()
    print("2. Substitua a URL no código abaixo")
    print("3. Execute a análise")
    print()
    
    # Exemplo de uso (com URL placeholder)
    psd_url = "https://exemplo.com/storage/teste_font.psd"  # SUBSTITUIR pela URL real
    
    print(f"[INFO] Analisando PSD via Adobe API...")
    print(f"[INFO] URL do PSD: {psd_url}")
    
    # Obter manifesto do documento
    manifest = api.get_document_manifest(psd_url)
    
    if manifest:
        print("[OK] Manifesto obtido - processando assincronamente")
        
        # Salvar resultado
        output_file = psd_path.replace('.psd', '_adobe_api_result.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'source_file': psd_path,
                'psd_url': psd_url,
                'api_method': 'adobe_photoshop_api',
                'manifest_response': manifest,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2, ensure_ascii=False)
        
        print(f"[SALVO] Resultado da API em: {output_file}")
        print()
        print("[INFO] A Adobe API processa de forma assíncrona.")
        print("[INFO] Verifique o status da requisição usando o job ID retornado.")
    
    else:
        print("[ERRO] Não foi possível obter o manifesto")
        print()
        print("[DEMO] Como ficaria o resultado da extração de fontes:")
        demo_result = {
            "fonts_extracted": [
                "Arial-Bold",
                "Helvetica-Regular", 
                "Times-Italic"
            ],
            "text_layers": [
                {
                    "name": "_bold",
                    "text": "WOQMTESTE DE FONT",
                    "font": "Arial-Bold",
                    "fontSize": 50,
                    "color": {"r": 0, "g": 0, "b": 0, "a": 255}
                },
                {
                    "name": "_light", 
                    "text": "LIGHT",
                    "font": "Helvetica-Light",
                    "fontSize": 31,
                    "color": {"r": 0, "g": 0, "b": 0, "a": 255}
                }
            ]
        }
        
        print(json.dumps(demo_result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()