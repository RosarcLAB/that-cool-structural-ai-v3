import React from 'react';
import { Project } from '../../customTypes/types';
import { ProjectCard } from './ProjectCard';
import { FolderIcon } from '../utility/icons';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onEditProject,
  onDeleteProject,
}) => {
  // TODO: Implement these handlers
  const handleSetDefault = (projectId: string) => console.log('Set default:', projectId);
  const handleSave = (project: Project) => console.log('Save:', project);
  const handleShare = (projectId: string) => console.log('Share:', projectId);

  return (
    <div className="space-y-2">
      {projects.length > 0 ? (
        projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={selectedProjectId === project.id}
            onNavigateToElements={() => onSelectProject(project.id)}
            onEdit={() => onEditProject(project)}
            onDelete={() => onDeleteProject(project.id)}
            onSetDefault={handleSetDefault}
            onSave={handleSave}
            onShare={handleShare}
            isDefault={false} // Or determine this from project data
          />
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FolderIcon className="w-12 h-12 mx-auto mb-2" />
          <p>No projects found.</p>
          <p className="text-sm">Create a new project to get started.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
