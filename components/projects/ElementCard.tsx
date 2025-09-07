import React from 'react';
import { Element as StructuralElement } from '../../customTypes/structuralElement';

// Reuse small icons similar to ProjectCard
const EditIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);
const DeleteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);
const ShareIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 0-2.186m0 2.186c-.18.324-.283.696-.283 1.093s.103.77.283 1.093m0-2.186Zm-9.566-5.314a2.25 2.25 0 1 0 0-2.186m0 2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186Z" />
  </svg>
);

export interface ElementCardProps {
  element: StructuralElement;
  onClick: (element: StructuralElement) => void;
  onEdit?: (element: StructuralElement) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  isSelected?: boolean;
}

export const ElementCard: React.FC<ElementCardProps> = ({
  element,
  onClick,
  onEdit,
  onDelete,
  onShare,
  isSelected = false,
}) => {
  const handleCardClick = () => {
    onClick(element);
  };

  const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit?.(element); };
  const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete?.(element.id); };
  const handleShare = (e: React.MouseEvent) => { e.stopPropagation(); onShare?.(element.id); };

  // Get the primary section for display
  const primarySectionName = element.sectionName || element.sections?.[0]?.name || 'N/A';

  return (
    <div
      className={`card card-compact bg-base-100 shadow-sm hover:shadow-md transition-shadow border ${isSelected ? 'border-primary' : 'border-base-300'} cursor-pointer p-0 rounded-lg relative pb-12`}
      onClick={handleCardClick}
    >
      <div className="card-body">
        <h3 className="card-title text-sm">{element.name}</h3>
        <div className="flex justify-between items-center text-xs text-base-content/70">
          <span>{element.type}</span>
          <span className="font-mono">{primarySectionName}</span>
        </div>
      </div>

      {/* Anchored bottom icon action bar (like ProjectCard) */}
      <div className="absolute left-0 right-0 bottom-0 px-3 pb-3 flex justify-center pointer-events-none">
        <div className="w-full max-w-sm flex gap-2 overflow-x-auto justify-center bg-base-200/60 rounded-md px-2 py-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <button title="Edit Element" onClick={handleEdit} className="btn btn-ghost btn-xs btn-circle" aria-label="edit-element">
            <EditIcon className="w-4 h-4" />
          </button>
          <button title="Delete Element" onClick={handleDelete} className="btn btn-ghost btn-xs btn-circle" aria-label="delete-element">
            <DeleteIcon className="w-4 h-4" />
          </button>
          <button title="Share Element" onClick={handleShare} className="btn btn-ghost btn-xs btn-circle" aria-label="share-element">
            <ShareIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
