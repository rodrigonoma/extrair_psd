import classNames from 'classnames';
import { useState, useRef } from 'react';
import UploadIcon from './icons/Upload.svg';
import classes from './UploadZone.module.css';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  accept?: string[];
  filetypeNotice?: string;
  children: React.ReactNode;
}

function UploadZone({
  children,
  onUpload,
  accept = ['.psd', '.psb'],
  filetypeNotice = 'Suporta formatos .psd e .psb'
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    const fileExtension = '.' + file.name.split('.').pop();
    if (!accept.includes(fileExtension)) {
      // Idealmente, mostraríamos um erro para o usuário aqui.
      console.warn(`File type not accepted: ${fileExtension}`);
      return;
    }
    onUpload(file);
  };

  return (
    <div
      className={classNames(classes.uploadZone, { [classes.dragging]: isDragging })}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()} // Permite clicar em qualquer lugar da zona
    >
      <UploadIcon className={classes.uploadIcon} />
      <span className={classes.mainText}>Arraste e solte seu arquivo aqui</span>
      <span className={classes.separator}>ou</span>
      <button 
        type="button" 
        className={`button button--primary ${classes.uploadButton}`}
        onClick={(e) => {
          e.stopPropagation(); // Impede que o clique no botão acione o OnClick do div pai
          inputRef.current?.click();
        }}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        className={classes.hiddenInput}
        type="file"
        onChange={(event) => handleFileChange(event.target.files)}
        accept={accept.join(',')}
      />
      {filetypeNotice && <small className={classes.filetypeNotice}>{filetypeNotice}</small>}
    </div>
  );
}

export default UploadZone;
