import React, { useCallback } from 'react';
import { Upload, FileCode } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.xml')) {
      onFileSelect(file);
    } else {
        alert("Please upload a valid XML file.");
    }
  }, [onFileSelect, isProcessing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
        isProcessing 
          ? 'border-gray-200 bg-gray-50 cursor-wait' 
          : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 cursor-pointer'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-white rounded-full shadow-sm">
          {isProcessing ? (
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : (
             <Upload className="w-8 h-8 text-blue-600" />
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isProcessing ? 'Processing Report...' : 'Upload Navisworks XML Report'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Drag & drop or click to select
          </p>
        </div>

        <input
          type="file"
          accept=".xml"
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
          onChange={handleChange}
        />
        <label 
          htmlFor="file-upload"
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            isProcessing ? 'text-gray-400' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
          }`}
        >
          Select File
        </label>
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
        <FileCode size={14} />
        <span>Supports standard Navisworks XML Export</span>
      </div>
    </div>
  );
};

export default FileUpload;
