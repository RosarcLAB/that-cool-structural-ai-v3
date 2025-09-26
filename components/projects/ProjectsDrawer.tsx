import React, { useState } from 'react';
import { Element as StructuralElement } from '../../customTypes/structuralElement';
import { Project} from '../../customTypes/types';
// import ProjectList from './ProjectList'; // inlined below
import { ElementCard } from './ElementCard';
import { ProjectHeader } from './ProjectHeader';
import { ProjectCard } from './ProjectCard';
import { FolderIcon, CloseIcon, SearchIcon, AddIcon } from '../utility/icons';

// Removed local SVG definitions as they are now imported from icons.tsx

interface ProjectsDrawerProps {
  isOpen: boolean; // Controls whether the drawer is visible
  onClose: () => void; // Callback to close the drawer
  projects: Project[];  // Raw projects list passed from parent
  elements: StructuralElement[];  // Raw elements list for the selected project
  selectedProject: Project | null; // Currently selected project, null if viewing projects list
  onSelectProject: (project: Project) => void; // Callback when a project is selected
  onBackToProjects: () => void; // Callback to return to projects list view
  onAddProject: () => void; // Callback to add a new project
  onEditProject: (project: Project) => void; // Callback to edit a project
  onDeleteProject: (id: string) => void; // Callback to delete a project by ID
  onSetDefault: (projectId: string) => void; // Callback to set a project as default
  defaultProjectId?: string | null; // ID of the default project
  onElementClick: (element: StructuralElement) => void; // Callback when an element is clicked
  onElementDoubleClick: (element: StructuralElement) => void; // Callback for double-clicking an element
  onElementDelete: (elementId: string) => void; // Callback to delete an element by ID
  onElementDuplicate: (element: StructuralElement) => void; // Callback to duplicate an element
}

export const ProjectsDrawer: React.FC<ProjectsDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  elements,
  selectedProject,
  onSelectProject,
  onBackToProjects,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onSetDefault,
  defaultProjectId,
  onElementClick,
  onElementDoubleClick,
  onElementDelete,
  onElementDuplicate,
}) => {
  // Local state for search filter term
  const [filterTerm, setFilterTerm] = useState('');
  // Early return if drawer is not open
  if (!isOpen) return null;
  // Determine current view: 'projects' or 'elements'
  const view = selectedProject ? 'elements' : 'projects';
  // Filter projects based on search term
  const visibleProjects = projects.filter(p =>
    p.name.toLowerCase().includes(filterTerm.toLowerCase())
  );
  // Filter elements based on search term and sort by last edited (most recent first)
  const visibleElements = elements
    .filter(e => e.name.toLowerCase().includes(filterTerm.toLowerCase()))
    .sort((a, b) => {
      // Sort by updatedAt timestamp, most recent first
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

  return (
    // Main drawer container with fixed positioning and shadow
    <div className="absolute top-0 left-0 h-full w-80 bg-base-100 shadow-lg z-20 flex flex-col">
      {/* Header section with title and close button */}
      <div className="flex-shrink-0 p-4 border-b border-base-300">
        {view === 'projects' ? (
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Projects</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-base-300">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <ProjectHeader
            project={selectedProject!}
            onBack={onBackToProjects}
            onEdit={onEditProject}
          />
        )}
      </div>

      {/* Search input and add button section */}
      <div className="p-4">
    <div className="relative rounded-full border-2 border-primary p-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
          <input
            type="text"
            placeholder={view === 'projects' ? 'Search projects...' : 'Search elements...'}
            value={filterTerm}
            onChange={e => setFilterTerm(e.target.value)}
            className="input input-ghost w-full pl-10 rounded-full bg-white shadow-inner focus:outline-none"
          />
        </div>
        {view === 'projects' && (
          <button
            onClick={onAddProject}
            className="bg-primary text-white border-none w-full mt-4 rounded-lg py-2 flex items-center justify-center gap-2 hover:bg-primary-focus"
          >
            <AddIcon className="w-5 h-5" />
            Add Project
          </button>
        )}
      </div>

      {/* Scrollable content area for lists */}
      <div className="flex-grow overflow-y-auto px-4 pb-4">
        {view === 'projects' ? (
          <div className="space-y-2">
            {visibleProjects.length > 0 ? (
              visibleProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isSelected={selectedProject?.id === project.id}
                  onNavigateToElements={() => onSelectProject(project)}
                  onEdit={() => onEditProject(project)}
                  onDelete={() => onDeleteProject(project.id)}
                  onSetDefault={() => onSetDefault(project.id)}
                  onSave={() => {/* TODO */}}
                  onShare={() => {/* TODO */}}
                  isDefault={defaultProjectId === project.id}
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
        ) : (
          <div className="space-y-2">
            {visibleElements.map(element => (
              <ElementCard
                key={element.id}
                element={element}
                onClick={() => onElementClick(element)}
                onDoubleClick={() => onElementDoubleClick(element)}
                onDelete={() => onElementDelete(element.id)}
                onDuplicate={() => onElementDuplicate(element)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};