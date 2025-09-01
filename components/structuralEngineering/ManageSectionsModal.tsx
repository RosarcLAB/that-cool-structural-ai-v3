// components/structuralEngineering/ManageSectionsModal.tsx
import React, { useState, useEffect } from 'react';
import { SectionProperties } from '../../customTypes/SectionProperties';
import { generateButtonCSS } from '../../customTypes/styles';
import { StructuralSectionForm } from './StructuralSectionForm';
import { AddIcon } from '../utility/icons';
import { Spinner } from '../utility/Spinner';

type Mode = 'create' | 'edit' | 'duplicate';

interface ManageSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: SectionProperties[];
  onSave: (sectionData: SectionProperties, mode: Mode) => Promise<SectionProperties | null>;
  onDelete: (sectionId: string) => Promise<boolean>;
}

export const ManageSectionsModal: React.FC<ManageSectionsModalProps> = ({ isOpen, onClose, sections, onSave, onDelete }) => {
  const [selectedSection, setSelectedSection] = useState<SectionProperties | null>(null);
  const [formMode, setFormMode] = useState<Mode | null>(null);
  const [formKey, setFormKey] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'country' | 'depth' | 'width' | 'elastic_modulus_E'>('name');
  
  // Filter sections based on search criteria
  const filteredSections = sections.filter(section => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    switch (searchBy) {
      case 'name':
        return section.name.toLowerCase().includes(term);
      case 'country':
        return section.country?.toLowerCase().includes(term) || false;
      case 'depth':
        return section.d?.toString().includes(searchTerm) || false;
      case 'width':
        return section.b?.toString().includes(searchTerm) || false;
      case 'elastic_modulus_E':
        return section.elastic_modulus_E?.toString().includes(searchTerm) || false;
      default:
        return true;
    }
  });
  
  useEffect(() => {
    if (!isOpen) {
      setFormMode(null);
      setSelectedSection(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: SectionProperties, mode: Mode) => {
    setIsSaving(true);
    let dataToSave = { ...data };
    if (mode === 'duplicate') {
        const { id, ...rest } = dataToSave; // remove original ID
        dataToSave = { ...rest, name: `${data.name} (Copy)` } as SectionProperties;
    }
    const savedSection = await onSave(dataToSave, mode);
    if (savedSection) {
      setFormMode(null);
      setSelectedSection(savedSection);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (selectedSection && window.confirm(`Are you sure you want to delete "${selectedSection.name}"?`)) {
      setIsSaving(true);
      const success = await onDelete(selectedSection.id);
      if (success) {
        setSelectedSection(null);
      }
      setIsSaving(false);
    }
  };

  const openForm = (mode: Mode) => {
    setFormKey(Date.now()); // Force re-mount of form component
    setFormMode(mode);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const renderContent = () => {
    if (formMode) {
      let initialData: SectionProperties | undefined = undefined;
      if ((formMode === 'edit' || formMode === 'duplicate') && selectedSection) {
        initialData = selectedSection;
      }
      return (
        <StructuralSectionForm
          key={formKey}
          mode={formMode}
          initialData={initialData}
          sectionsList={sections}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormMode(null)}
        />
      );
    }

    return (
      <div className="flex flex-col">
        {/*  Header */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-neutral">Manage Sections</h2>
            <div className="flex gap-2">
              <button onClick={() => openForm('create')} className="btn-primary flex items-center gap-2"><AddIcon className="w-5 h-5"/>Add New</button>
            </div>
          </div>
        </div>
        
        {/*  Search Interface */}
        <div className="mb-4">
          <div className="flex gap-2 items-center">
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value as typeof searchBy)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="name">Search by Name</option>
              <option value="country">Search by Country</option>
              <option value="depth">Search by Depth (mm)</option>
              <option value="width">Search by Width (mm)</option>
              <option value="elastic_modulus_E">Search by E-Modulus (MPa)</option>
            </select>
            <input
              type="text"
              placeholder={`Search by ${searchBy}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        {/* Table with dynamic height up to 7 rows */}
        <div className="border rounded-lg overflow-hidden mb-4">
          <div 
            className="overflow-y-auto" 
            style={{ 
              maxHeight: `${Math.min(filteredSections.length + 1, 8) * 50}px` // +1 for header, max 8 total (7 data + header)
            }}
          >
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Material</th>
                  <th className="p-3">Shape</th>
                  <th className="p-3">Depth (mm)</th>
                  <th className="p-3">Width (mm)</th>
                </tr>
              </thead>
              <tbody>
                {filteredSections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-gray-500">
                      {searchTerm ? 'No sections match your search criteria.' : 'No sections available.'}
                    </td>
                  </tr>
                ) : (
                  filteredSections.map(sec => (
                    <tr key={sec.id} onClick={() => setSelectedSection(sec)} className={`cursor-pointer hover:bg-teal-50 ${selectedSection?.id === sec.id ? 'bg-teal-100' : ''}`}>
                      <td className="p-3 font-medium">{sec.name}</td>
                      <td className="p-3 capitalize">{sec.material}</td>
                      <td className="p-3 capitalize">{sec.shape}</td>
                      <td className="p-3">{sec.d}</td>
                      <td className="p-3">{sec.b}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/*  Footer */}
        <div className="flex justify-between items-center">
          <div>
            {selectedSection && (
              <div className="flex gap-2">
                <button onClick={() => openForm('edit')} className="btn-edit" disabled={!selectedSection}>Edit</button>
                <button onClick={() => openForm('duplicate')} className="btn-duplicate" disabled={!selectedSection}>Duplicate</button>
                <button onClick={handleDelete} className="btn-danger" disabled={!selectedSection}>Delete</button>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredSections.length} of {sections.length} sections
          </div>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    );
  };

  return (
    <div onClick={handleOverlayClick} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 m-4 max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all relative">
        {isSaving && <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20"><Spinner /></div>}
        {renderContent()}
        <style>{generateButtonCSS()}</style>
      </div>
    </div>
  );
};
