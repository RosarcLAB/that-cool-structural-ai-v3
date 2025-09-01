// components/chat/UploadDrawingModal.tsx: A modal for the dedicated "Analyze Drawing" feature.

import React, { useState, useEffect } from 'react';
import { UploadIcon } from '../utility/icons';
import { Spinner } from '../utility/Spinner';
import { CollapsibleSection } from '../utility/CollapsibleSection';
import { StandardLoads } from '../../customTypes/types';
import { useStandardLoads } from '../../contexts/StandardLoadsContext';

interface UploadDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, loads: StandardLoads) => Promise<void>;
}

const LoadInput: React.FC<{ name: keyof StandardLoads, label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ name, label, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
            <input
                type="number"
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                min="0"
                step="0.01"
                className="block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-teal-200/50"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">kPa</span>
            </div>
        </div>
    </div>
);


export const UploadDrawingModal: React.FC<UploadDrawingModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { standardLoads, setStandardLoads } = useStandardLoads();
  
  // Reset local component state when the modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
        setSelectedFile(null);
        setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please upload a file smaller than 10MB.");
        return;
      }
      setSelectedFile(file);
    }
  };
  
  const handleLoadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = Math.max(0, Number(value)); // Prevent negative numbers
    setStandardLoads({ ...standardLoads, [name]: numValue });
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
        alert("Please select a file to analyze.");
        return;
    };
    setIsSubmitting(true);
    await onSubmit(selectedFile, standardLoads);
    // State is reset by useEffect when isOpen becomes false
  };
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
    >
      <div className="bg-white rounded-xl shadow-2xl p-8 m-4 max-w-lg w-full transform transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-neutral">Analyze Drawing</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        
        <p className="text-gray-600 mb-6">Upload a drawing (PDF, PNG, JPG) and define the standard loads to use for the analysis.</p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="modal-file-upload"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
            />
            <label htmlFor="modal-file-upload" className="cursor-pointer">
              <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-primary font-semibold">
                {selectedFile ? 'Change file' : 'Choose a file'}
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, or PDF (Max 10MB)</p>
            </label>
        </div>
        
        {selectedFile && (
            <div className="mt-4 text-center text-sm text-gray-700 bg-gray-100 p-2 rounded-md">
                Selected: <span className="font-medium">{selectedFile.name}</span>
            </div>
        )}

        <div className="my-6">
            <CollapsibleSection 
                title="Standard Load Assumptions" 
                defaultCollapsed={false}
                headerClassName="bg-teal-50 hover:bg-teal-100"
                contentClassName="p-4 space-y-4"
            >
                 <p className="text-sm text-gray-500 mb-4">Set the default area loads for the analysis. These settings will be saved for your next session. Enter 0 to use the AI's internal default for a specific load type.</p>
                 <div className="space-y-4">
                    {/* Floor Loads */}
                    <div>
                        <h5 className="font-semibold text-gray-800">Floor Loads</h5>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1 pl-2 border-l-2 border-teal-200">
                            <LoadInput name="floorDead" label="Dead Load" value={standardLoads.floorDead} onChange={handleLoadChange} />
                            <LoadInput name="floorLive" label="Live Load" value={standardLoads.floorLive} onChange={handleLoadChange} />
                        </div>
                    </div>
                    {/* Roof Loads */}
                     <div>
                        <h5 className="font-semibold text-gray-800">Roof Loads</h5>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1 pl-2 border-l-2 border-blue-200">
                            <LoadInput name="roofDead" label="Dead Load" value={standardLoads.roofDead} onChange={handleLoadChange} />
                            <LoadInput name="roofLive" label="Live Load" value={standardLoads.roofLive} onChange={handleLoadChange} />
                            <LoadInput name="roofWind" label="Wind Load" value={standardLoads.roofWind} onChange={handleLoadChange} />
                        </div>
                    </div>
                    {/* Wall Loads */}
                     <div>
                        <h5 className="font-semibold text-gray-800">Wall Loads</h5>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1 pl-2 border-l-2 border-red-200">
                            <LoadInput name="wallDead" label="Dead Load" value={standardLoads.wallDead} onChange={handleLoadChange} />
                             <LoadInput name="wallLive" label="Live Load" value={standardLoads.wallLive} onChange={handleLoadChange} />
                            <LoadInput name="wallWind" label="Wind Load" value={standardLoads.wallWind} onChange={handleLoadChange} />
                        </div>
                    </div>
                 </div>
            </CollapsibleSection>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button onClick={onClose} className="px-5 py-2.5 bg-gray-200 text-neutral font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedFile}
            className="w-48 inline-flex justify-center items-center px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-focus transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Spinner /> : "Analyze Drawing"}
          </button>
        </div>
      </div>
    </div>
  );
};