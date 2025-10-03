// components/structuralEngineering/ElementEditPanel.tsx
import React, { useState, useEffect } from 'react';
import { Element, ELEMENT_TYPE_OPTIONS } from '../../customTypes/structuralElement';

interface ElementEditPanelProps {
  element: Element | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (element: Element) => void;
  onDelete?: (elementId: string) => void;
}

const ElementEditPanel: React.FC<ElementEditPanelProps> = ({
  element,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editedElement, setEditedElement] = useState<Element | null>(null);

  useEffect(() => {
    if (element) {
      setEditedElement({ ...element });
    }
  }, [element]);

  if (!isOpen || !editedElement) {
    return null;
  }

  const handleSave = () => {
    if (editedElement) {
      onSave(editedElement);
      onClose();
    }
  };

  const handleDelete = () => {
    if (editedElement?.id && onDelete) {
      if (confirm(`Are you sure you want to delete "${editedElement.name}"?`)) {
        onDelete(editedElement.id);
        onClose();
      }
    }
  };

  const inputClasses = "input input-sm input-bordered w-full";
  const labelClasses = "label text-xs font-semibold";

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-base-100 shadow-2xl border-l border-base-300 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-base-200 p-4 border-b border-base-300 flex justify-between items-center z-10">
        <h3 className="text-lg font-bold">Edit Element</h3>
        <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">✕</button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-primary">Basic Information</h4>
          
          <div>
            <label className={labelClasses}>Element Name</label>
            <input
              type="text"
              value={editedElement.name || ''}
              onChange={(e) => setEditedElement({ ...editedElement, name: e.target.value })}
              className={inputClasses}
              placeholder="Enter element name"
            />
          </div>

          <div>
            <label className={labelClasses}>Element Type</label>
            <select
              value={editedElement.type || ''}
              onChange={(e) => setEditedElement({ ...editedElement, type: e.target.value })}
              className={inputClasses}
            >
              {Object.entries(ELEMENT_TYPE_OPTIONS).map(([key, value]) => (
                <option key={key} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses}>Span (m)</label>
            <input
              type="number"
              step="0.1"
              value={editedElement.span || 0}
              onChange={(e) => setEditedElement({ ...editedElement, span: parseFloat(e.target.value) })}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Section Info */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-primary">Section</h4>
          <div>
            <label className={labelClasses}>Section Name</label>
            <input
              type="text"
              value={editedElement.sectionName || ''}
              onChange={(e) => setEditedElement({ ...editedElement, sectionName: e.target.value })}
              className={inputClasses}
              placeholder="e.g., 200x45 LVL"
            />
          </div>
        </div>

        {/* Supports Summary */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-primary">Supports</h4>
          <div className="text-sm text-gray-600">
            {editedElement.supports?.length || 0} support(s)
          </div>
          {editedElement.supports?.map((support, idx) => {
            const posDisplay = typeof support.position === 'number' 
              ? `${support.position}m` 
              : `x:${support.position.x}${support.position.y !== undefined ? `, y:${support.position.y}` : ''}${support.position.z !== undefined ? `, z:${support.position.z}` : ''}m`;
            return (
              <div key={idx} className="text-xs bg-base-200 p-2 rounded">
                Position: {posDisplay} | {support.fixity}
              </div>
            );
          })}
        </div>

        {/* Loads Summary */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-primary">Applied Loads</h4>
          <div className="text-sm text-gray-600">
            {editedElement.appliedLoads?.length || 0} load(s)
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 bg-base-200 p-4 border-t border-base-300 flex gap-2">
        <button onClick={handleSave} className="btn btn-primary btn-sm flex-1">
          Save Changes
        </button>
        {onDelete && (
          <button onClick={handleDelete} className="btn btn-error btn-sm">
            Delete
          </button>
        )}
        <button onClick={onClose} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ElementEditPanel;
