import { useFileProcessing } from './FileProcessingContext';
import FileSelectionScreen from './FileSelectionScreen';
import LoadingScreen from './LoadingScreen';
import NewResultScreen from './NewResultScreen';
import NoSSRWrapper from './NoSSRWrapper';

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
      {isProcessing && (
        <NoSSRWrapper>
          <LoadingScreen text={processMessage} />
        </NoSSRWrapper>
      )}
      {!!result && (
        <NoSSRWrapper>
          <NewResultScreen />
        </NoSSRWrapper>
      )}
    </>
  );
}

export default FileProcessing;
