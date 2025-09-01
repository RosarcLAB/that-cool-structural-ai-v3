// components/utility/defaults.ts: Default values and factory functions for the application

import { Project } from '../../customTypes/types';

/**
 * Create a default project with basic properties
 */
export function createDefaultProject(ownerId: string, projectName: string): Omit<Project, 'id'> {
  return {
    name: projectName,
    description: '',
    location: {
      city: '',
      country: '',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId,
    projectMembers: [],
    buildingInfo: {
      type: '',
      stories: 1,
      totalArea: 0,
      structuralSystem: '',
      foundationType: '',
    },
    elements: [],
    elementCount: 0,
    status: 'draft',
    version: '1.0',
    isActive: true,
  };
}
