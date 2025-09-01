import UploadZone from './UploadZone';

interface FileSelectionScreenProps {
  onFileSelected: (file: any) => void;
}

function FileSelectionScreen({ onFileSelected }: FileSelectionScreenProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#333'
        }}>
          Editor Completo de PSD
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#666', 
          marginBottom: '2rem',
          maxWidth: '600px'
        }}>
          Envie seu arquivo do Photoshop para visualizar, editar textos, cores, formas e gerar novas imagens PNG em tempo real
        </p>
      </div>
      
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <UploadZone
          onUpload={(file: File) => {
            const objectURL = URL.createObjectURL(file);
            onFileSelected({
              name: file.name,
              url: objectURL,
              thumbnailUrl: ''
            });
          }}
          accept={['.psd', '.psb']}
          filetypeNotice="Suporta formatos .psd e .psb"
        >
          Escolher Arquivo PSD
        </UploadZone>
      </div>
      
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          🚀 Recursos disponíveis:
        </h3>
        <ul style={{ 
          textAlign: 'left', 
          color: '#666',
          listStyle: 'none',
          padding: 0
        }}>
          <li style={{ marginBottom: '0.5rem' }}>✏️ <strong>Editar textos</strong> - Altere conteúdo, tamanho e cores</li>
          <li style={{ marginBottom: '0.5rem' }}>🎨 <strong>Editar formas</strong> - Modifique cores de preenchimento e bordas</li>
          <li style={{ marginBottom: '0.5rem' }}>👁️ <strong>Controlar visibilidade</strong> - Mostre/oculte elementos</li>
          <li style={{ marginBottom: '0.5rem' }}>🖼️ <strong>Gerar PNG</strong> - Exporte imagens com as alterações</li>
          <li>📊 <strong>Análise completa</strong> - Veja todos os elementos do PSD</li>
        </ul>
      </div>
    </div>
  );
}

export default FileSelectionScreen;
