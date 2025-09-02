import UploadZone from './UploadZone';
import { FontManager } from './FontManager';
import { useFileProcessing } from './FileProcessingContext';
import styles from './FileSelectionScreen.module.css';

interface FileSelectionScreenProps {
  onFileSelected: (file: any) => void;
}

function FileSelectionScreen({ onFileSelected }: FileSelectionScreenProps) {
  const { updateFontDefinitions } = useFileProcessing();

  const handleFontsUpdated = (fonts: any) => {
    console.log('New fonts detected in FontManager:', fonts);
    updateFontDefinitions(fonts);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Editor Completo de PSD</h1>
        <p className={styles.subtitle}>
          Envie seu arquivo do Photoshop para visualizar, editar textos, cores, formas e gerar novas imagens PNG em tempo real.
        </p>
      </div>

      <div className={styles.uploadContainer}>
        <UploadZone
          onUpload={(file: File) => {
            const objectURL = URL.createObjectURL(file);
            onFileSelected({
              name: file.name,
              url: objectURL,
              thumbnailUrl: ''
            });
          }}
        >
          Selecionar Arquivo PSD
        </UploadZone>
      </div>

      <div className={styles.features}>
        <h3 className={styles.featuresTitle}>🚀 Recursos Disponíveis</h3>
        <ul className={styles.featuresList}>
          <li className={styles.featureItem}>✏️ <strong>Editar textos</strong></li>
          <li className={styles.featureItem}>🎨 <strong>Editar formas</strong></li>
          <li className={styles.featureItem}>👁️ <strong>Controlar visibilidade</strong></li>
          <li className={styles.featureItem}>🖼️ <strong>Gerar PNG</strong></li>
          <li className={styles.featureItem}>📊 <strong>Análise completa</strong></li>
          <li className={styles.featureItem}>🔄 <strong>Regeneração com IA</strong></li>
        </ul>
      </div>

      <div className={styles.fontManagerContainer}>
        <FontManager onFontsUpdated={handleFontsUpdated} />
      </div>
    </div>
  );
}

export default FileSelectionScreen;
