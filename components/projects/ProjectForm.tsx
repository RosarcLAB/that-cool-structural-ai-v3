import React, { useState, useEffect } from 'react';
import { Project } from '../../customTypes/types';
import { SaveIcon } from '../utility/icons';
import { projectService } from '../../services/projectService';

export interface ProjectFormProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProject: Project) => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Project>(project);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Collapsible section states
  const [basicInfoCollapsed, setBasicInfoCollapsed] = useState(false);
  const [locationCollapsed, setLocationCollapsed] = useState(true);
  const [buildingInfoCollapsed, setBuildingInfoCollapsed] = useState(true);
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const [settingsCollapsed, setSettingsCollapsed] = useState(true);

  // Update form data when project prop changes
  useEffect(() => {
    setFormData(project);
    setIsDirty(false);
  }, [project]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleLocationChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
    setIsDirty(true);
  };

  const handleBuildingInfoChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      buildingInfo: {
        ...prev.buildingInfo,
        [field]: value
      }
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update the project in the database
      await projectService.updateProject(project.id, {
        ...formData,
        updatedAt: new Date()
      });
      
      // Call the parent callback with updated data
      onSave({
        ...formData,
        updatedAt: new Date()
      });
      
      setIsDirty(false);
      console.log('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
      // You might want to show an error toast/notification here
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(project);
    setIsDirty(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
      ></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-base-100 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-base-100 px-6 py-4 border-b border-base-300 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-base-content">Edit Project</h2>
                <p className="text-sm text-base-content/70 mt-1">Update project information and settings</p>
              </div>
              <button
                onClick={handleCancel}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="border rounded-lg overflow-hidden border-primary/20">
                <div 
                  className="w-full flex justify-between items-center p-3 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
                  onClick={() => setBasicInfoCollapsed(!basicInfoCollapsed)}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-semibold text-base-content text-lg">Basic Information</h4>
                  </div>
                  <svg className={`w-5 h-5 transition-transform ${basicInfoCollapsed ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
                {!basicInfoCollapsed && (
                <div className="border-t p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Project Name</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="Enter project name"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Status</span>
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="select select-bordered w-full"
                      >
                        <option value="draft">Draft</option>
                        <option value="in-progress">In Progress</option>
                        <option value="under-review">Under Review</option>
                        <option value="approved">Approved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    
                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text font-semibold">Description</span>
                      </label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="textarea textarea-bordered h-24 w-full"
                        placeholder="Enter project description"
                      />
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* Location Information */}
              <div className="border rounded-lg overflow-hidden border-primary/20">
                <div 
                  className="w-full flex justify-between items-center p-3 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
                  onClick={() => setLocationCollapsed(!locationCollapsed)}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h4 className="font-semibold text-base-content text-lg">Location</h4>
                  </div>
                  <svg className={`w-5 h-5 transition-transform ${locationCollapsed ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
                {!locationCollapsed && (
                <div className="border-t p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text font-semibold">Address</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location?.address || ''}
                        onChange={(e) => handleLocationChange('address', e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="Enter full address"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">City</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location?.city || ''}
                        onChange={(e) => handleLocationChange('city', e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="Enter city"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">State/Province</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location?.state || ''}
                        onChange={(e) => handleLocationChange('state', e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="Enter state or province"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Country</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location?.country || ''}
                        onChange={(e) => handleLocationChange('country', e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="Enter country"
                      />
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* Building Information */}
              <div className="border rounded-lg overflow-hidden border-primary/20">
                <div 
                  className="w-full flex justify-between items-center p-3 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
                  onClick={() => setBuildingInfoCollapsed(!buildingInfoCollapsed)}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h4 className="font-semibold text-base-content text-lg">Building Information</h4>
                  </div>
                  <svg className={`w-5 h-5 transition-transform ${buildingInfoCollapsed ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
                {!buildingInfoCollapsed && (
                <div className="border-t p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Building Type</span>
                      </label>
                      <select
                        value={formData.buildingInfo?.type || ''}
                        onChange={(e) => handleBuildingInfoChange('type', e.target.value)}
                        className="select select-bordered w-full"
                      >
                        <option value="">Select building type</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="industrial">Industrial</option>
                        <option value="institutional">Institutional</option>
                        <option value="mixed-use">Mixed Use</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Number of Stories</span>
                      </label>
                      <input
                        type="number"
                        value={formData.buildingInfo?.stories || ''}
                        onChange={(e) => handleBuildingInfoChange('stories', parseInt(e.target.value) || 0)}
                        className="input input-bordered w-full"
                        placeholder="Enter number of stories"
                        min="1"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Total Area (m²)</span>
                      </label>
                      <input
                        type="number"
                        value={formData.buildingInfo?.totalArea || ''}
                        onChange={(e) => handleBuildingInfoChange('totalArea', parseFloat(e.target.value) || 0)}
                        className="input input-bordered w-full"
                        placeholder="Enter total area"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Structural System</span>
                      </label>
                      <select
                        value={formData.buildingInfo?.structuralSystem || ''}
                        onChange={(e) => handleBuildingInfoChange('structuralSystem', e.target.value)}
                        className="select select-bordered w-full"
                      >
                        <option value="">Select structural system</option>
                        <option value="steel frame">Steel Frame</option>
                        <option value="concrete">Concrete</option>
                        <option value="wood">Wood</option>
                        <option value="masonry">Masonry</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text font-semibold">Foundation Type</span>
                      </label>
                      <select
                        value={formData.buildingInfo?.foundationType || ''}
                        onChange={(e) => handleBuildingInfoChange('foundationType', e.target.value)}
                        className="select select-bordered w-full"
                      >
                        <option value="">Select foundation type</option>
                        <option value="spread footings">Spread Footings</option>
                        <option value="pile">Pile Foundation</option>
                        <option value="mat">Mat Foundation</option>
                        <option value="slab on grade">Slab on Grade</option>
                        <option value="basement">Basement</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* Project Timeline */}
              <div className="border rounded-lg overflow-hidden border-primary/20">
                <div 
                  className="w-full flex justify-between items-center p-3 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
                  onClick={() => setTimelineCollapsed(!timelineCollapsed)}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="font-semibold text-base-content text-lg">Project Timeline</h4>
                  </div>
                  <svg className={`w-5 h-5 transition-transform ${timelineCollapsed ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
                {!timelineCollapsed && (
                <div className="border-t p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Start Date</span>
                      </label>
                      <input
                        type="date"
                        value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleInputChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                        className="input input-bordered w-full"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Target Completion Date</span>
                      </label>
                      <input
                        type="date"
                        value={formData.targetCompletionDate ? new Date(formData.targetCompletionDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleInputChange('targetCompletionDate', e.target.value ? new Date(e.target.value) : undefined)}
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* Version and Settings */}
              <div className="border rounded-lg overflow-hidden border-primary/20">
                <div 
                  className="w-full flex justify-between items-center p-3 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
                  onClick={() => setSettingsCollapsed(!settingsCollapsed)}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h4 className="font-semibold text-base-content text-lg">Settings</h4>
                  </div>
                  <svg className={`w-5 h-5 transition-transform ${settingsCollapsed ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
                {!settingsCollapsed && (
                <div className="border-t p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Version</span>
                      </label>
                      <input
                        type="text"
                        value={formData.version || ''}
                        onChange={(e) => handleInputChange('version', e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="e.g., v1.0.0"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label cursor-pointer">
                        <span className="label-text font-semibold">Active Project</span>
                        <input
                          type="checkbox"
                          checked={formData.isActive !== false}
                          onChange={(e) => handleInputChange('isActive', e.target.checked)}
                          className="toggle toggle-primary"
                        />
                      </label>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating Save Button */}
          <div className="sticky bottom-0 bg-base-100 px-6 py-4 border-t border-base-300 rounded-b-xl shadow-lg">
            <div className="flex justify-between items-center">
              <div className="text-sm text-base-content/70">
                {isDirty && (
                  <span className="flex items-center text-warning">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.168 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
