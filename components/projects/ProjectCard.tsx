import React from 'react';
import { Project } from '../../customTypes/types';

// SVG Icon Components
const MoreVertIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);
const BookmarkIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
);
const EditIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);
const SaveIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.012-1.244h3.86M12 4.5v6.75" />
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


export interface ProjectCardProps {
  project: Project;
  isSelected?: boolean;
  onNavigateToElements: (project: Project) => void;
  onEdit: (project: Project) => void;
  onSetDefault: (projectId: string) => void;
  onSave: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onShare: (projectId: string) => void;
  isDefault?: boolean;
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

  const handleSetDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetDefault(project.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(project);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(project.id);
  };

  const handleCardClick = () => {
    onNavigateToElements(project);
  };

  return (
    <div
      className={`card card-compact bg-base-100 shadow-md hover:shadow-lg transition-shadow border ${isSelected ? 'border-primary' : 'border-base-300'} cursor-pointer p-4 rounded-lg`}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow pr-4">
          <h3 className="font-bold text-lg mb-1">{project.name}</h3>
          <p className="text-sm text-base-content/70 truncate mb-2">{project.description}</p>
          <div className="flex items-center text-xs text-base-content/50 mb-1">
            <span>{project.location.city}, {project.location.country}</span>
          </div>
          <p className="text-xs text-base-content/50">{project.elementCount} elements</p>
        </div>
        
        <div className="dropdown dropdown-end flex-shrink-0">
          <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle" onClick={(e) => e.stopPropagation()}>
            <MoreVertIcon className="w-5 h-5" />
          </label>
          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-200 rounded-box w-52 z-10">
            <li><a onClick={handleSetDefault}>
              <BookmarkIcon className={`w-4 h-4 ${isDefault ? 'text-primary' : ''}`} /> 
              {isDefault ? 'Default Project' : 'Set as Default'}
            </a></li>
            <li><a onClick={handleEdit}>
              <EditIcon className="w-4 h-4" /> Edit Project
            </a></li>
            <li><a onClick={handleSave}>
              <SaveIcon className="w-4 h-4" /> Save
            </a></li>
            <li><a onClick={handleDelete}>
              <DeleteIcon className="w-4 h-4" /> Delete
            </a></li>
            <li><a onClick={handleShare}>
              <ShareIcon className="w-4 h-4" /> Share
            </a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
