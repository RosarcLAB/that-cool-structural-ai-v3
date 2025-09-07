import React from 'react';
import { Element as StructuralElement } from '../../customTypes/structuralElement';
import { Project} from '../../customTypes/types';
import ProjectList from './ProjectList';
import { ElementCard } from './ElementCard';
import { ProjectHeader } from './ProjectHeader';

// SVG Icon Components to replace lucide-react
const XIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

interface ProjectsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  elements: StructuralElement[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onBackToProjects: () => void;
  onSearch: (term: string) => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onElementClick: (element: StructuralElement) => void;
}

export const ProjectsDrawer: React.FC<ProjectsDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  elements,
  selectedProject,
  onSelectProject,
  onBackToProjects,
  onSearch,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onElementClick,
}) => {
  if (!isOpen) return null;

  const view = selectedProject ? 'elements' : 'projects';

  return (
    <div className="absolute top-0 left-0 h-full w-80 bg-base-100 shadow-lg z-20 flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-base-300">
        {view === 'projects' ? (
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Projects</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-base-300"><XIcon className="w-5 h-5" /></button>
          </div>
        ) : (
          <ProjectHeader project={selectedProject!} onBack={onBackToProjects} onEdit={onEditProject} />
        )}
      </div>

      <div className="p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
          <input
            type="text"
            placeholder={view === 'projects' ? 'Search projects...' : 'Search elements...'}
            className="input input-bordered w-full pl-10"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        {view === 'projects' && (
          <button onClick={onAddProject} className="btn btn-primary w-full mt-4">
            <PlusIcon className="w-5 h-5" />
            Add Project
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto px-4 pb-4">
        {view === 'projects' ? (
          <ProjectList
            projects={projects}
            selectedProjectId={null}
            onSelectProject={(id) => onSelectProject(projects.find(p => p.id === id)!)}
            onEditProject={onEditProject}
            onDeleteProject={onDeleteProject}
          />
        ) : (
          <div className="space-y-2">
            {elements.map(element => (
              <ElementCard key={element.id} element={element} onClick={() => onElementClick(element)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};