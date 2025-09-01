import { useFileProcessing } from './FileProcessingContext';
import FileSelectionScreen from './FileSelectionScreen';
import LoadingScreen from './LoadingScreen';
import NewResultScreen from './NewResultScreen';

function FileProcessing() {
  const { currentFile, result, isProcessing, processMessage, processFile } =
    useFileProcessing();

  return (
    <>
      {!currentFile && (
        <FileSelectionScreen
          onFileSelected={(file) => {
            processFile(file);
          }}
        />
      )}
      {isProcessing && <LoadingScreen text={processMessage} />}
      {!!result && <NewResultScreen />}
    </>
  );
}

export default FileProcessing;
