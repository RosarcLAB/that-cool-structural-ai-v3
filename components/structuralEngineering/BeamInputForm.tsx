// components/structuralEngineering/BeamInputForm.tsx: A form for users to input or modify beam properties before analysis.

import React, { useState, useEffect, useMemo } from 'react';
import { BeamInput, Support, Load, SupportFixityType, LoadType } from '../../customTypes/structuralElement';
import { AddIcon, RemoveIcon } from '../utility/icons';
import { FormCollapsibleSectionWithStagedSummary } from '../utility/CollapsibleSection';

// Props definition for the BeamInputForm component.
interface BeamInputFormProps {
  initialData: BeamInput;
  onSubmit: (data: BeamInput) => void;
  onChange?: (data: BeamInput) => void; // Optional: Makes the component "controlled" for live updates
  onCancel?: () => void;
  isFormActive?: boolean;
  submitButtonText?: string;
}

// Default values for a new beam, used if no initial data is provided.
const defaultSpan = 3;
export const defaultBeamInput: BeamInput = {
  Name: "My Beam",
  sectionName: "2/240x45 SG8",
  Span: defaultSpan,
  E: 8, // Modulus of Elasticity in GPa
  I: 0.00010368, // Reasonable I value (m^4)
  A: 0.0216,   // Reasonable A value (m^2)
  Supports: [
    { position: 0, fixity: SupportFixityType.Pinned },
    { position: defaultSpan, fixity: SupportFixityType.Roller },
  ],
  Loads: [{ name: "Uniform Load", type: LoadType.UDL, magnitude: [2000], position: ['0', String(defaultSpan)] }], // Default to 2 kN/m -> 20000 N/m
};

// Utility function to format magnitude values with appropriate units
    const formatMagnitudeWithUnit = (magnitude: number | number[], loadType: LoadType): string => {
        if (Array.isArray(magnitude)) {
            if (loadType === LoadType.PointLoad) {
                return `${magnitude[0]?.toFixed(2) || '0.00'} kN`;
            } else if (loadType === LoadType.TrapezoidalLoad && magnitude.length > 1) {
                return `${magnitude[0]?.toFixed(2) || '0.00'}/${magnitude[1]?.toFixed(2) || '0.00'} kN/m`;
            } else {
                return `${magnitude[0]?.toFixed(2) || '0.00'} kN/m`;
            }
        } else {
            if (loadType === LoadType.PointLoad) {
                return `${magnitude?.toFixed(2) || '0.00'} kN`;
            } else {
                return `${magnitude?.toFixed(2) || '0.00'} kN/m`;
            }
        }
    };

export const BeamInputForm: React.FC<BeamInputFormProps> = ({ 
  initialData,
  onSubmit, 
  onChange,
  onCancel, 
  isFormActive = true,
  submitButtonText = "Analyze Beam",
}) => {
  // This state holds the form's current, possibly edited, data.
  const [editedBeam, setEditedBeam] = useState<BeamInput>(initialData);
  const [wasCancelled, setWasCancelled] = useState(false);
  const formId = useMemo(() => crypto.randomUUID(), []);

  // A component is "controlled" if an `onChange` prop is provided.
  const isControlled = onChange !== undefined;

  // This effect ensures that if the parent component sends new initialData (e.g., from an undo action),
  // our internal edited state resets to match it.
  useEffect(() => {
    setEditedBeam(initialData);
  }, [initialData]);

  // Memoize whether the current edited state has changed from its initial prop state.
  // This now works correctly for both controlled and uncontrolled modes.
  const hasChanges = useMemo(() => {
    return JSON.stringify(editedBeam) !== JSON.stringify(initialData);
  }, [editedBeam, initialData]);

  // This is the single point of truth for updating the form's data.
  // It updates its own state AND calls the parent's `onChange` if controlled.
  const handleDataChange = (newBeamData: BeamInput) => {
    // Enforce engineering rule: a single support must be fixed.
    if (newBeamData.Supports.length === 1 && newBeamData.Supports[0].fixity !== SupportFixityType.Fixed) {
        const newSupports = [...newBeamData.Supports];
        newSupports[0] = { ...newSupports[0], fixity: SupportFixityType.Fixed };
        newBeamData = { ...newBeamData, Supports: newSupports };
    }
    
    setEditedBeam(newBeamData); // Always update the internal edited state.
    if (isControlled) {
        onChange(newBeamData); // Propagate the change to the parent if controlled.
    }
  };


  // Handles changes to top-level beam properties like Span, E, I, A.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['Span', 'E', 'I', 'A'].includes(name);
    const newValue = isNumeric ? Number(value) : value;

    let newBeam = { ...editedBeam, [name]: newValue };

    // If the span changes, automatically update the positions of the last support and loads.
    if (name === 'Span') {
      const newSpan = Number(value);

      // Update the position of the last support to match the new span.
      if (newBeam.Supports.length > 0) {
        const lastSupportIndex = newBeam.Supports.length - 1;
        const newSupports = [...newBeam.Supports];
        newSupports[lastSupportIndex] = { ...newSupports[lastSupportIndex], position: newSpan };
        newBeam.Supports = newSupports;
      }

      // Update the positions of the loads based on the new span.
      newBeam.Loads = newBeam.Loads.map(load => {
        const newLoad = { ...load };
        if (newLoad.type === LoadType.PointLoad) {
          // For point loads, center them on the new span.
          newLoad.position = [String(newSpan / 2)];
        } else if (newLoad.position.length > 1) {
          // For UDLs and Trapezoidal loads, update the end position to match the new span.
          const newPositions = [...newLoad.position];
          newPositions[newPositions.length - 1] = String(newSpan);
          newLoad.position = newPositions;
        }
        return newLoad;
      });
    }
    
    handleDataChange(newBeam);
  };
  

  // Handles changes to individual support properties.
  const handleSupportChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newSupports = [...editedBeam.Supports];
    const newSupport = { ...newSupports[index], [name]: name === 'position' ? Number(value) : value };
    newSupports[index] = newSupport;
    handleDataChange({ ...editedBeam, Supports: newSupports });
  };
  
  // Handles when the user changes the type of a load.
  const handleLoadTypeChange = (loadIndex: number, newType: LoadType) => {
    const newLoads = [...editedBeam.Loads];
    const currentLoad = { ...newLoads[loadIndex] };
    
    currentLoad.type = newType;

    // Reset position and name to sensible defaults
    if (newType === LoadType.PointLoad) {
        currentLoad.position = [String(editedBeam.Span / 2)];
        currentLoad.name = 'New Point Load';
    } else { // For UDL and Trapezoidal
        currentLoad.position = ['0', String(editedBeam.Span)];
        currentLoad.name = newType === LoadType.UDL ? 'New UDL' : 'New Trapezoidal Load';
    }

    // Adjust magnitude array based on new type
    if (newType === LoadType.TrapezoidalLoad) {
        // If it was a single value, duplicate it for start and end.
        if (currentLoad.magnitude.length === 1) {
            currentLoad.magnitude = [currentLoad.magnitude[0], currentLoad.magnitude[0]];
        }
    } else {
        // If it was trapezoidal, keep only the start value.
        if (currentLoad.magnitude.length > 1) {
            currentLoad.magnitude = [currentLoad.magnitude[0]];
        }
    }
    
    newLoads[loadIndex] = currentLoad;
    handleDataChange({ ...editedBeam, Loads: newLoads });
  };

  const handleLoadGenericChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newLoads = [...editedBeam.Loads];
    const newLoad = { ...newLoads[index], [name]: value };
    newLoads[index] = newLoad;
    handleDataChange({ ...editedBeam, Loads: newLoads });
  };

  // Handles changes to a load's magnitude value(s). User input is in kN, state is in N.
  const handleLoadMagnitudeChange = (loadIndex: number, magnitudeIndex: number, value: string) => {
    const newLoads = [...editedBeam.Loads];
    const newMagnitudes = [...newLoads[loadIndex].magnitude];
    newMagnitudes[magnitudeIndex] = Number(value) * 1000; // Convert kN input to N for state
    newLoads[loadIndex] = { ...newLoads[loadIndex], magnitude: newMagnitudes };
    handleDataChange({ ...editedBeam, Loads: newLoads });
  };

  // Handles changes to the position of a load.
  const handleLoadPositionChange = (loadIndex: number, posIndex: number, value: string) => {
    const newLoads = [...editedBeam.Loads];
    const newPositions = [...newLoads[loadIndex].position];
    newPositions[posIndex] = value;
    newLoads[loadIndex] = { ...newLoads[loadIndex], position: newPositions };
    handleDataChange({ ...editedBeam, Loads: newLoads });
  };

  // Functions to add or remove supports and loads.
  const addSupport = () => handleDataChange({...editedBeam, Supports: [...editedBeam.Supports, { position: editedBeam.Span, fixity: SupportFixityType.Roller }]});
  const removeSupport = (index: number) => handleDataChange({...editedBeam, Supports: editedBeam.Supports.filter((_, i) => i !== index)});
  const addLoad = () => handleDataChange({...editedBeam, Loads: [...editedBeam.Loads, { name: "New Point Load", type: LoadType.PointLoad, magnitude: [0], position: [String(editedBeam.Span/2)]}]});
  const removeLoad = (index: number) => handleDataChange({...editedBeam, Loads: editedBeam.Loads.filter((_, i) => i !== index)});

  // Wrapper for the onSubmit prop. State is already in base units (N).
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The 'editedBeam' state is already in the correct base units (N, m, Pa), so no conversion is needed here.
    onSubmit(editedBeam);
  };
  
  // Wrapper for the onCancel prop, marks the form as cancelled.
  const handleCancel = () => {
    setWasCancelled(true);
    if(onCancel) {
      onCancel();
    }
  };

  // Handles reverting the form state to the initial data.
  const handleRevert = () => {
    setEditedBeam(initialData); // Reset internal edited state
    if (isControlled) {
      onChange(initialData); // Also revert parent state
    }
  };

  const inputClasses = "block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-teal-200/50";

  // If the form is no longer active, display a status message.
  if (!isFormActive) {
    const statusText = wasCancelled ? 'Cancelled.' : `Submitted.`;
    return (
        <div className="p-3 text-sm italic text-gray-500 text-center border rounded-lg bg-gray-50">
            <p className="font-semibold">{initialData.Name}</p>
            {initialData.sectionName && <p className="text-xs">({initialData.sectionName})</p>}
            <p>(Span: {initialData.Span}m)</p>
            <p className="mt-1">{statusText}</p>
        </div>
    );
  }

  // Renders the full, interactive form.
  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-xl shadow-sm bg-base-100">
      <h3 className="text-lg font-bold text-center text-neutral">{editedBeam.Name}</h3>
      {/* General Beam Properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor={`beam-name-${formId}`} className="block mb-1 text-sm font-medium text-gray-700">Beam Name</label>
            <input id={`beam-name-${formId}`} type="text" name="Name" value={editedBeam.Name} onChange={handleChange} className={inputClasses} />
        </div>
        <div>
            <label htmlFor={`section-name-${formId}`} className="block mb-1 text-sm font-medium text-gray-700">Section Name</label>
            <input id={`section-name-${formId}`} type="text" name="sectionName" value={editedBeam.sectionName} onChange={handleChange} className={inputClasses} />
        </div>
        <div>
            <label htmlFor={`span-${formId}`} className="block mb-1 text-sm font-medium text-gray-700">Span (m)</label>
            <input id={`span-${formId}`} type="number" step="any" name="Span" value={editedBeam.Span} onChange={handleChange} className={inputClasses} />
        </div>
        <div>
            <label htmlFor={`E-${formId}`} className="block mb-1 text-sm font-medium text-gray-700">E (GPa)</label>
            <input id={`E-${formId}`} type="number" step="any" name="E" value={editedBeam.E} onChange={handleChange} className={inputClasses} />
        </div>
        <div>
            <label htmlFor={`I-${formId}`} className="block mb-1 text-sm font-medium text-gray-700">I (m⁴)</label>
            <input id={`I-${formId}`} type="number" step="any" name="I" value={editedBeam.I} onChange={handleChange} className={inputClasses} />
        </div>
        <div>
            <label htmlFor={`A-${formId}`} className="block mb-1 text-sm font-medium text-gray-700">A (m²)</label>
            <input id={`A-${formId}`} type="number" step="any" name="A" value={editedBeam.A} onChange={handleChange} className={inputClasses} />
        </div>
      </div>
      
      {/* Supports Section */}
      <FormCollapsibleSectionWithStagedSummary
        title="Supports"
        color="bg-sky-50"
        enableDoubleClickExpand={true}
        defaultStage="preview"
        summaryItems={[
            { label: '', value: editedBeam.Supports.length+" No"  },
            { label: 'Types', value: editedBeam.Supports, arrayDisplayType: 'list', arrayProperty: 'fixity', maxArrayItems: 2 },
            { label: 'Positions', value: editedBeam.Supports, arrayDisplayType: 'list', arrayProperty: 'position', maxArrayItems: 2, unit: 'm' },

        ]}
      >
        <div className="space-y-2">
            {editedBeam.Supports.map((support, index) => (
            <div key={index} className="p-3 bg-secondary border border-sky-200 rounded-lg grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                <div>
                    <label htmlFor={`support-pos-${formId}-${index}`} className="block mb-1 text-xs font-medium text-gray-700">Position (m)</label>
                    <input id={`support-pos-${formId}-${index}`} type="number" step="any" name="position" value={support.position} onChange={(e) => handleSupportChange(index, e)} className={inputClasses} />
                </div>
                <div>
                    <label htmlFor={`support-fixity-${formId}-${index}`} className="block mb-1 text-xs font-medium text-gray-700">Fixity</label>
                    <select id={`support-fixity-${formId}-${index}`} name="fixity" value={support.fixity} onChange={(e) => handleSupportChange(index, e)} className={inputClasses}>
                    {Object.values(SupportFixityType).map(fixity => <option key={fixity} value={fixity}>{fixity}</option>)}
                    </select>
                </div>
                <button type="button" onClick={() => removeSupport(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50 self-end mb-1" disabled={editedBeam.Supports.length <= 1}>
                    <RemoveIcon className="w-6 h-6"/>
                </button>
            </div>
            ))}
        </div>
        <button type="button" onClick={addSupport} className="w-full mt-3 flex items-center justify-center gap-2 text-sm font-semibold p-2 border-2 border-dashed border-gray-300 rounded-lg transition-colors text-sky-700 hover:border-sky-500 hover:bg-sky-50">
            <AddIcon className="w-5 h-5" /> Add Support
        </button>
      </FormCollapsibleSectionWithStagedSummary>
      
      {/* Loads Section */}
      <FormCollapsibleSectionWithStagedSummary
        title="Loads"
        color="bg-teal-50"
        enableDoubleClickExpand={true}
        defaultStage="preview"
        summaryItems={[
            { label: '', value: editedBeam.Loads.length+" No" },
            { label: 'Names', value: editedBeam.Loads, arrayDisplayType: 'list', arrayProperty: 'name', maxArrayItems: 3 },
            { label: 'Types', value: editedBeam.Loads, arrayDisplayType: 'list', arrayProperty: 'type', maxArrayItems: 3 },
            { label: 'Magnitudes', value: editedBeam.Loads.flatMap(load => (load.magnitude).map(m => m / 1000)), arrayDisplayType: 'list', maxArrayItems: 3 },
            { label: 'Positions', value: editedBeam.Loads.flatMap(l => l.position.join(' to ')), arrayDisplayType: 'list', maxArrayItems: 2, unit: 'm' }
        ]}
      >
        <div className="space-y-3">
            {editedBeam.Loads.map((load, index) => (
                <div key={index} className="p-3 bg-teal-50/60 border border-teal-200 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-teal-800">{load.name}</span>
                        <button type="button" onClick={() => removeLoad(index)} className="text-red-500 hover:text-red-700">
                            <RemoveIcon className="w-5 h-5"/>
                        </button>
                    </div>

                    <div>
                        <label className="block mb-1 text-xs font-medium text-gray-700">Load Type</label>
                        <select value={load.type} onChange={(e) => handleLoadTypeChange(index, e.target.value as LoadType)} className={inputClasses}>
                            {Object.values(LoadType).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>

                    {/* Magnitude Inputs: full-width for UDL/Point, grid for Trapezoidal */}
                    <div className={load.type === LoadType.TrapezoidalLoad ? "grid grid-cols-2 gap-3" : ""}>
                        {load.magnitude.map((mag, magIndex) => (
                            <div key={magIndex} className={load.type !== LoadType.TrapezoidalLoad ? "w-full" : ""}>
                                <label className="block mb-1 text-xs font-medium text-gray-700">
                                    {load.type === LoadType.TrapezoidalLoad ? (magIndex === 0 ? 'Start ' : 'End ') : ''}Magnitude (kN/m or kN)
                                </label>
                                <input type="number" step="any" value={mag / 1000} onChange={(e) => handleLoadMagnitudeChange(index, magIndex, e.target.value)} className={inputClasses} />
                            </div>
                        ))}
                    </div>

                    {/* Position Inputs: full-width for Point, grid for UDL/Trapezoidal */}
                    <div className={load.type !== LoadType.PointLoad ? "grid grid-cols-2 gap-3" : ""}>
                        {load.position.map((pos, posIndex) => (
                            <div key={posIndex} className={load.type === LoadType.PointLoad ? "w-full" : ""}>
                                <label className="block mb-1 text-xs font-medium text-gray-700">
                                    {load.type === LoadType.PointLoad ? 'Position' : (posIndex === 0 ? 'Start Position' : 'End Position')} (m)
                                </label>
                                <input type="text" value={pos} onChange={(e) => handleLoadPositionChange(index, posIndex, e.target.value)} className={inputClasses} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
        <button type="button" onClick={addLoad} className="w-full mt-3 flex items-center justify-center gap-2 text-sm font-semibold p-2 border-2 border-dashed border-gray-300 rounded-lg transition-colors text-teal-700 hover:border-teal-500 hover:bg-teal-50">
            <AddIcon className="w-5 h-5" /> Add Load
        </button>
      </FormCollapsibleSectionWithStagedSummary>
      
      {/* Action Buttons */}
      <div className="flex justify-end items-center gap-4">
        {hasChanges && (
            <button type="button" onClick={handleRevert} className="px-5 py-2.5 bg-yellow-100 text-yellow-800 font-semibold rounded-lg hover:bg-yellow-200 transition-colors">Undo Changes</button>
        )}
        {onCancel && <button type="button" onClick={handleCancel} className="px-5 py-2.5 bg-gray-200 text-neutral font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>}
        <button type="submit" className="px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-focus transition-colors">{submitButtonText}</button>
      </div>
    </form>
  );
};