import React, { useState } from 'react';
import { Project } from '../../customTypes/types';
import { ArrowBackIcon, EditIcon } from '../utility/icons';
import { ProjectForm } from './ProjectForm';

export interface ProjectHeaderProps {
  project: Project;
  onBack: () => void;
  onEdit: (project: Project) => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onBack,
  onEdit,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleSaveProject = (updatedProject: Project) => {
    onEdit(updatedProject);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col p-4 bg-base-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                  <button onClick={onBack} className="btn btn-ghost btn-sm btn-circle mr-2">
                      <ArrowBackIcon className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold">Project Elements</h2>
              </div>
              <button onClick={handleEditClick} className="btn btn-sm btn-primary">
                  <EditIcon className="w-4 h-4 mr-1" />
                  Edit
              </button>
          </div>
      <div className="pl-10">
        <h3 className="font-bold text-lg text-primary">{project.name}</h3>
        <p className="text-sm text-base-content/80">{project.description}</p>

    <div className="mt-3 flex items-center text-sm text-base-content/80 space-x-4">
          {/* Address */}
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-base-content/70">
              <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
            </svg>
            <span title={project.location?.address || ''}>{
              project.location?.city
                ?? (project.location?.city ? `${project.location.city}${project.location?.country ? ', ' + project.location.country : ''}` : '—')
            }</span>
          </div>

          {/* Elements count */}
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-base-content/70">
              <path fill="currentColor" d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
            </svg>
            <span>{(project.elements && project.elements.length) ?? project.elementCount ?? 0} elements</span>
          </div>
        </div>

              <div className="mt-3 text-xs text-base-content/60 flex gap-4">
                  <span>Created: {formatDate(project.createdAt)}</span>
                  <span>Updated: {formatDate(project.updatedAt)}</span>
              </div>
      </div>
      </div>
      
      {/* Project Edit Modal */}
      <ProjectForm
        project={project}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
      />
    </>
  );
};

function toDate(value?: any): Date | null {
  if (!value) return null;
  // Firestore Timestamp has toDate()
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number' || typeof value === 'string') return new Date(value);
  if (value instanceof Date) return value;
  return null;
}

function formatDate(value?: any) {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB');
}
