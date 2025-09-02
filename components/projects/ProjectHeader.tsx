import React from 'react';
import { Project } from '../../customTypes/types';

// SVG Icon Components
const ArrowBackIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);


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
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(project);
  };

  return (
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
        </div>
    </div>
  );
};
