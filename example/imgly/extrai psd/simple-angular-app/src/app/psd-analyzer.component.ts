import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface AnalysisResult {
  success: boolean;
  file_info: {
    original_name: string;
    size_mb: number;
  };
  analysis: {
    fonts_found: string[];
    total_fonts: number;
    timestamp: string;
  };
}

@Component({
  selector: 'app-psd-analyzer',
  template: `
    <div class="analyzer-container">
      <!-- Header -->
      <div class="header">
        <h1>🎨 Extrator de Fontes PSD</h1>
        <p>Faça upload de um arquivo PSD/PSB para extrair todas as fontes utilizadas</p>
      </div>

      <!-- Upload Section -->
      <div class="upload-section" *ngIf="!result">
        <div 
          class="drop-zone"
          [class.drag-over]="isDragOver"
          [class.has-file]="selectedFile"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()">
          
          <div *ngIf="!selectedFile" class="drop-content">
            <div class="upload-icon">📎</div>
            <h3>Arraste um arquivo PSD aqui</h3>
            <p>ou clique para selecionar</p>
            <small>Formatos: PSD, PSB | Máximo: 50MB</small>
          </div>
          
          <div *ngIf="selectedFile" class="file-selected">
            <div class="file-icon">📄</div>
            <div class="file-info">
              <h4>{{selectedFile.name}}</h4>
              <p>{{formatFileSize(selectedFile.size)}}</p>
            </div>
            <button class="remove-btn" (click)="removeFile($event)">✖</button>
          </div>
        </div>

        <input #fileInput type="file" accept=".psd,.psb" (change)="onFileSelect($event)" style="display: none">

        <div class="actions" *ngIf="selectedFile && !isUploading">
          <button class="btn-primary" (click)="uploadFile()">🔍 Analisar Fontes</button>
          <button class="btn-secondary" (click)="reset()">🗑️ Limpar</button>
        </div>

        <div class="loading" *ngIf="isUploading">
          <div class="spinner"></div>
          <p>Analisando arquivo PSD...</p>
        </div>

        <div class="error" *ngIf="errorMessage">
          <span>⚠️ {{errorMessage}}</span>
        </div>
      </div>

      <!-- Results Section -->
      <div class="results-section" *ngIf="result">
        <div class="result-header">
          <h2>📊 Análise Concluída</h2>
          <div class="file-summary">
            <p><strong>Arquivo:</strong> {{result.file_info.original_name}}</p>
            <p><strong>Tamanho:</strong> {{result.file_info.size_mb}} MB</p>
            <p><strong>Fontes encontradas:</strong> <span class="font-count">{{result.analysis.total_fonts}}</span></p>
          </div>
        </div>

        <div class="fonts-list" *ngIf="result.analysis.fonts_found.length > 0">
          <h3>🔤 Fontes Identificadas:</h3>
          <div class="fonts-grid">
            <div class="font-item" *ngFor="let font of result.analysis.fonts_found; let i = index">
              <span class="font-number">{{i + 1}}</span>
              <span class="font-name">{{font}}</span>
            </div>
          </div>

          <div class="result-actions">
            <button class="btn-primary" (click)="copyToClipboard()">📋 Copiar Lista</button>
            <button class="btn-secondary" (click)="downloadResults()">💾 Baixar JSON</button>
          </div>
        </div>

        <div class="no-fonts" *ngIf="result.analysis.fonts_found.length === 0">
          <div class="no-fonts-icon">🤷‍♂️</div>
          <h3>Nenhuma fonte identificada</h3>
          <p>Este arquivo PSD pode não conter layers de texto ou as fontes podem estar em um formato não reconhecível.</p>
        </div>

        <div class="new-analysis">
          <button class="btn-outline" (click)="reset()">🔄 Analisar Outro Arquivo</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analyzer-container {
      color: white;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 300;
    }

    .header p {
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .drop-zone {
      border: 3px dashed rgba(255, 255, 255, 0.5);
      border-radius: 12px;
      padding: 3rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: rgba(255, 255, 255, 0.1);
      margin-bottom: 2rem;
    }

    .drop-zone:hover {
      border-color: rgba(255, 255, 255, 0.8);
      background: rgba(255, 255, 255, 0.2);
    }

    .drop-zone.drag-over {
      border-color: #4ade80;
      background: rgba(74, 222, 128, 0.2);
      transform: scale(1.02);
    }

    .drop-content .upload-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .file-selected {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .file-icon {
      font-size: 2rem;
    }

    .file-info {
      flex: 1;
      text-align: left;
    }

    .file-info h4 {
      margin: 0;
      font-weight: 500;
    }

    .file-info p {
      margin: 0;
      opacity: 0.8;
      font-size: 0.9rem;
    }

    .remove-btn {
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 2rem;
      height: 2rem;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .remove-btn:hover {
      background: #dc2626;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.3s ease;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .btn-outline {
      background: transparent;
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.5);
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: white;
    }

    .loading {
      text-align: center;
      padding: 2rem;
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 3rem;
      height: 3rem;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      color: #fef2f2;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    .results-section {
      animation: fadeIn 0.5s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .result-header {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      text-align: center;
    }

    .file-summary {
      margin-top: 1rem;
      display: grid;
      gap: 0.5rem;
    }

    .font-count {
      background: #3b82f6;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-weight: bold;
    }

    .fonts-list {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .fonts-grid {
      display: grid;
      gap: 0.75rem;
      margin: 1.5rem 0 2rem;
    }

    .font-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      transition: background 0.2s ease;
    }

    .font-item:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .font-number {
      background: #3b82f6;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      min-width: 2rem;
      text-align: center;
    }

    .font-name {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 1rem;
      font-weight: 500;
    }

    .result-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .no-fonts {
      text-align: center;
      padding: 3rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .no-fonts-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .new-analysis {
      text-align: center;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 2rem;
      }
      
      .drop-zone {
        padding: 2rem 1rem;
      }
      
      .actions {
        flex-direction: column;
      }
      
      .result-actions {
        flex-direction: column;
      }
    }
  `]
})
export class PsdAnalyzerComponent {
  selectedFile: File | null = null;
  isDragOver = false;
  isUploading = false;
  result: AnalysisResult | null = null;
  errorMessage = '';
  apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectFile(files[0]);
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectFile(input.files[0]);
    }
  }

  selectFile(file: File) {
    this.errorMessage = '';
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !['psd', 'psb'].includes(fileExtension)) {
      this.errorMessage = 'Formato não suportado. Use: PSD, PSB';
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      this.errorMessage = 'Arquivo muito grande. Máximo: 50MB';
      return;
    }
    
    this.selectedFile = file;
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.selectedFile = null;
  }

  uploadFile() {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<AnalysisResult>(`${this.apiUrl}/analyze-psd`, formData)
      .subscribe({
        next: (result) => {
          this.result = result;
          this.isUploading = false;
        },
        error: (error) => {
          this.isUploading = false;
          this.errorMessage = error.error?.error || 'Erro ao conectar com o servidor';
          console.error('Erro:', error);
        }
      });
  }

  reset() {
    this.selectedFile = null;
    this.result = null;
    this.errorMessage = '';
    this.isUploading = false;
  }

  copyToClipboard() {
    if (!this.result) return;
    
    const fontsList = this.result.analysis.fonts_found.join('\n');
    navigator.clipboard.writeText(fontsList).then(() => {
      console.log('Lista copiada!');
    });
  }

  downloadResults() {
    if (!this.result) return;
    
    const dataStr = JSON.stringify(this.result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${this.result.file_info.original_name}_fonts.json`;
    link.click();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}