import React from 'react';
import { Element as StructuralElement } from '../../customTypes/structuralElement';

export interface ElementCardProps {
  element: StructuralElement;
  onClick: (element: StructuralElement) => void;
}

export const ElementCard: React.FC<ElementCardProps> = ({
  element,
  onClick,
}) => {
  const handleCardClick = () => {
    onClick(element);
  };

  // Get the primary section for display
  const primarySectionName = element.sectionName || element.sections?.[0]?.name || 'N/A';

  return (
    <div
      className="card card-compact bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-300 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="card-body">
        <h3 className="card-title text-sm">{element.name}</h3>
        <div className="flex justify-between items-center text-xs text-base-content/70">
          <span>{element.type}</span>
          <span className="font-mono">{primarySectionName}</span>
        </div>
      </div>
    </div>
  );
};
