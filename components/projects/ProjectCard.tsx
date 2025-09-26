import React from 'react';
import { Project } from '../../customTypes/types';
import { MoreVertIcon, BookmarkIcon, EditIcon, SaveIcon, DeleteIcon, ShareIcon } from '../utility/icons';


export interface ProjectCardProps {
  project: Project; // The project data to display
  isSelected?: boolean; // Whether this project is currently selected
  onNavigateToElements: (project: Project) => void; // Callback to navigate to the project's elements
  onEdit: (project: Project) => void; // Callback to edit the project
  onSetDefault: (projectId: string) => void; // Callback to set project as default
  onSave: (project: Project) => void; // Callback to save the project
  onDelete: (projectId: string) => void; // Callback to delete the project
  onShare: (projectId: string) => void; // Callback to share the project
  isDefault?: boolean; // Whether this project is the default
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected = false,
  onNavigateToElements,
  onEdit,
  onSetDefault,
  onSave,
  onDelete,
  onShare,
  isDefault = false,
}) => {
  // Event handlers for action buttons
  const handleSetDefault = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onSetDefault(project.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onEdit(project);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onSave(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onDelete(project.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onShare(project.id);
  };

  // Handler for card click to navigate to elements
  const handleCardClick = () => {
    onNavigateToElements(project);
  };

  return (
    // Main card container with hover and selection styling
    <div
      className={`card card-compact bg-base-100 shadow-md hover:shadow-lg transition-shadow border ${isSelected ? 'border-primary' : 'border-base-300'} cursor-pointer p-4 rounded-lg relative pb-12`}
      onClick={handleCardClick}
      title="click for elements and double click for Project Description" // Tooltip for user guidance
    >
      {/* Project information section */}
      <div className="flex justify-between items-start">
        <div className="flex-grow pr-4">
          <h3 className="font-bold text-lg mb-1">{project.name}</h3>
          <p className="text-sm text-base-content/70 truncate mb-2">{project.description}</p>
          <div className="flex items-center text-xs text-base-content/50 mb-1">
            <span>{project.location.city}, {project.location.country}</span>
          </div>
          <p className="text-xs text-base-content/50">{project.elementCount} elements</p>
        </div>
        
        {/* Action buttons bar anchored at bottom */}
        <div className="absolute left-0 right-0 bottom-0 px-3 pb-3 flex justify-center pointer-events-none">
          <div className="w-full max-w-md flex gap-2 overflow-x-auto justify-center bg-base-200/60 rounded-md px-2 py-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <button title={isDefault ? 'Default Project' : 'Set as Default'} onClick={handleSetDefault} className={`btn btn-ghost btn-xs btn-circle ${isDefault ? 'text-primary' : ''}`} aria-label="set-default">
              <BookmarkIcon className="w-4 h-4" />
            </button>
            {/* <button title="Edit Project" onClick={handleEdit} className="btn btn-ghost btn-xs btn-circle" aria-label="edit">
              <EditIcon className="w-4 h-4" />
            </button> */}
            {/* <button title="Save" onClick={handleSave} className="btn btn-ghost btn-xs btn-circle" aria-label="save">
              <SaveIcon className="w-4 h-4" />
            </button> */}
            <button title="Delete" onClick={handleDelete} className="btn btn-ghost btn-xs btn-circle" aria-label="delete">
              <DeleteIcon className="w-4 h-4" />
            </button>
            {/* <button title="Share" onClick={handleShare} className="btn btn-ghost btn-xs btn-circle" aria-label="share">
              <ShareIcon className="w-4 h-4" />
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};
