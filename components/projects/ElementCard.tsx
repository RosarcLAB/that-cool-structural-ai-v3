import React from 'react';
import { ScaleIcon, ArrowsRightLeftIcon, Squares2X2Icon, TagIcon } from '@heroicons/react/24/outline';
import { EditIcon, DeleteIcon, ShareIcon, DoubleArrowIcon, SpanDimensionIcon, CopyIcon } from '../utility/icons';
import { Element as StructuralElement } from '../../customTypes/structuralElement';

// Badge component for info rows
const Badge: React.FC<{
  icon: React.FC<{ className?: string }>;
  color: string;
  text: string;
  tooltip: string;
}> = ({ icon: Icon, color, text, tooltip }) => (
  <div title={tooltip} className={`flex items-center space-x-1 px-3 py-1 ${color} border-l-4 bg-gray-50 rounded`}> 
    <Icon className="w-4 h-4 opacity-70" />
    <span className="text-xs font-semibold truncate">{text}</span>
  </div>
);



export interface ElementCardProps {
  element: StructuralElement;
  onClick: (element: StructuralElement) => void;
  onEdit?: (element: StructuralElement) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onDoubleClick?: (element: StructuralElement) => void;
  onDuplicate?: (element: StructuralElement) => void;
  isSelected?: boolean;
}

export const ElementCard: React.FC<ElementCardProps> = ({
  element,
  onClick,
  onEdit,
  onDelete,
  onShare,
  onDoubleClick,
  onDuplicate,
  isSelected = false,
}) => {
  // Event handlers for card and action buttons
  const handleCardClick = () => {
    onClick(element);
    console.log('Element clicked:', element)
  };

  const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit?.(element); };
  const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete?.(element.id); };
  const handleShare = (e: React.MouseEvent) => { e.stopPropagation(); onShare?.(element.id); };

  // Get the primary section for display
  const primarySectionName = element.sectionName || element.sections?.[0]?.name || 'N/A';

  return (
    // Main card container with hover and selection styling
    <div
      className={`card card-compact bg-base-100 shadow-sm hover:shadow-md transition-shadow border ${isSelected ? 'border-primary' : 'border-base-300'} cursor-pointer p-0 rounded-lg relative pb-12`}
      onClick={handleCardClick}
      onDoubleClick={() => onDoubleClick?.(element)}
      title="Click to edit in chat, double-click to edit in canvas" // Tooltip for user guidance
    >
      <div className="flex justify-between items-start"> 
        {/* Element information section */}
        <div className="card-body px-4 py-2">
          <h3 className="card-title font-bold text-sm mb-2 truncate ">{element.name}</h3>
          <div className="space-y-1">
            <Badge icon={SpanDimensionIcon} color="border-blue-400" text={`${element.span} m`} tooltip="Span" />
            <Badge icon={ArrowsRightLeftIcon} color="border-green-400" text={`${element.spacing} m`} tooltip="Spacing" />
            <Badge icon={Squares2X2Icon} color="border-purple-400" text={`${element.section_count}/${primarySectionName}`} tooltip="Sections" />
            <Badge icon={TagIcon} color="border-teal-400" text={element.type} tooltip="Type" />
          </div>
        </div>

        {/* Action buttons bar anchored at bottom */}
        <div className="absolute left-0 right-0 bottom-0 px-3 pb-3 flex justify-center pointer-events-none">
          <div className="w-full max-w-sm flex gap-2 overflow-x-auto justify-center bg-base-200/60 rounded-md px-2 py-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
             {/*
            <button title="Edit Element" onClick={handleEdit} className="btn btn-ghost btn-xs btn-circle" aria-label="edit-element">
              <EditIcon className="w-4 h-4" />
            </button>
            */}
            <button title="Delete Element" onClick={handleDelete} className="btn btn-ghost btn-xs btn-circle" aria-label="delete-element">
              <DeleteIcon className="w-4 h-4" />
            </button>
            <button title="Duplicate Element" onClick={(e) => { e.stopPropagation(); onDuplicate?.(element); }} className="btn btn-ghost btn-xs btn-circle" aria-label="duplicate-element">
              <CopyIcon className="w-4 h-4" />
            </button>
            {/*
                  <button title="Share Element" onClick={handleShare} className="btn btn-ghost btn-xs btn-circle" aria-label="share-element">
                    <ShareIcon className="w-4 h-4" />
                  </button>
            */}
          </div>
        </div>
      </div>
    </div>
  );
};
