// components/Engineering/StructuralElementForm.tsx
import React, { useState, useEffect } from 'react';
import { Element, LoadType, SupportFixityType, LoadCaseType, LoadCombination, LoadCaseFactor, LoadCombinationUtils, Load, DesignParameters, DesignOutput  } from '../../customTypes/structuralElement';
import { ELEMENT_TYPE_OPTIONS } from '../../customTypes/structuralElement';
// Ensure ELEMENT_TYPE_OPTIONS is exported as a default array from structuralElement.ts
import { AddIcon, RemoveIcon, SaveIcon  } from '../utility/icons';
 import { FormCollapsibleSectionWithStagedSummary, FormCollapsibleSection } from '../utility/CollapsibleSection';
import { MaterialType, SectionShape, SectionProperties } from '../../customTypes/SectionProperties';
import { Project } from '../../customTypes/types';
import { DesignResultsDisplay } from './DesignResultsDisplay';
 
 
 
 
interface StatusMessage {
    type: 'loading' | 'success' | 'error' | 'info';
    message: string;
    timestamp?: string;
}

interface StructuralElementFormProps {
    elementData: Element;
    elementDataList?: Element[]; // optional list for edit mode selection
    isFormActive: boolean;
    onSubmit: (data: Element) => void;
    onCancel?: () => void;
    onSave: (data: Element) => Promise<void>;
    sections: SectionProperties[]; // Changed from sectionData to sections
    projectData?: Project[];
    wasCancelledProp?: boolean; // Let parent control cancel state
    statusMessage?: StatusMessage | null; // Status messages from parent
}

const inputClasses = "block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-teal-200/50";
const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

// FIX: Export the component to be used in other files.
const StructuralElementForm: React.FC<StructuralElementFormProps> = ({
    elementData, elementDataList, isFormActive, onSubmit, onCancel, onSave, sections, projectData, statusMessage }) => {
     const [element, setElement] = useState<Element>(elementData);
     const [showResults, setShowResults] = useState<{[id: string]: boolean}>({});
     const [isSaved, setIsSaved] = useState<boolean>(elementData.isSaved || false);
    const elementNames = elementDataList ? elementDataList.map(el => el.name) : [];

    /**
     * Recomputes all load combinations for a given structural element.
     * @param currentElement The structural element to recompute load combinations for.
     * @returns The updated structural element with recomputed load combinations.
     */
    const recomputeAllLoadCombinations = (currentElement: Element): Element => {
        const utils = new LoadCombinationUtils();
        if (!currentElement.loadCombinations || !currentElement.appliedLoads) {
            return currentElement;
        }
        const updatedCombinations = currentElement.loadCombinations.map(combo => {
            // Only compute if it's not a 'Reaction' type, or handle as needed
            if (combo.combinationType !== 'Reaction') {
                const computedResult = utils.computeLoadCombination(currentElement.appliedLoads || [], combo);
                return { ...combo, computedResult };
            }
            return combo; // Return reaction combos unchanged
        });
        return { ...currentElement, loadCombinations: updatedCombinations };
    };


   /** Utility function to format magnitude values with appropriate units
    * @param magnitude The magnitude value(s) to format.
    * @param loadType The type of load being represented (e.g., PointLoad, TrapezoidalLoad).
    * @returns The formatted magnitude string with units.
   */
    const formatMagnitudeWithUnit = (magnitude: number | number[], loadType: LoadType | string): string => {
        const magnitudeInKN = Array.isArray(magnitude) ? magnitude.map(m => m / 1000) : magnitude / 1000;
        if (Array.isArray(magnitudeInKN)) {
            if (loadType === LoadType.PointLoad) {
                return `${magnitudeInKN[0]?.toFixed(2) || '0.00'} kN`;
            } else if (loadType === LoadType.TrapezoidalLoad && magnitudeInKN.length > 1) {
                return `${magnitudeInKN[0]?.toFixed(2) || '0.00'}/${magnitudeInKN[1]?.toFixed(2) || '0.00'} kN/m`;
            } else {
                return `${magnitudeInKN[0]?.toFixed(2) || '0.00'} kN/m`;
            }
        } else {
            if (loadType === LoadType.PointLoad) {
                return `${magnitudeInKN?.toFixed(2) || '0.00'} kN`;
            } else {
                return `${magnitudeInKN?.toFixed(2) || '0.00'} kN/m`;
            }
        }
    };

    // Helper function to check if any design results have failed
    const hasFailedDesignResults = (): boolean => {
        return element.designResults?.some(result => result.capacity_data.status === 'FAIL') || false;
    };

    //#region Effect Hooks
    
   // Effect to enforce engineering rules (e.g., a single support must be fixed).
    useEffect(() => {
       // If there's only one support, it must be a 'Fixed' support (cantilever).
       if (element.supports.length === 1 && element.supports[0].fixity !== SupportFixityType.Fixed) {
           const newSupports = [...element.supports];
           newSupports[0] = { ...newSupports[0], fixity: SupportFixityType.Fixed };
           setElement(prev => ({ ...prev, supports: newSupports }));
       }
    }, [element.supports]);

    // When span changes, update last support position and UDL/Trapezoidal loads positions
    useEffect(() => {
        setElement(prev => {
            const updated = { ...prev };
            // update last support if roller
            const lastIdx = updated.supports.length - 1;
            if (lastIdx >= 0 && updated.supports[lastIdx].fixity === SupportFixityType.Roller) {
                updated.supports[lastIdx] = { ...updated.supports[lastIdx], position: updated.span };
            }
            // update UDL, trapezoidal, and point loads
            updated.appliedLoads = updated.appliedLoads.map(load => {
                // UDL & trapezoidal: update end position to new span
                if ((load.type === LoadType.UDL || load.type === LoadType.TrapezoidalLoad) && load.position.length > 1) {
                    return { ...load, position: [load.position[0], String(updated.span)] };
                }
                // Point loads: reposition to mid-span
                if (load.type === LoadType.PointLoad) {
                    return { ...load, position: [String(updated.span / 2)] };
                }
                // leave other loads unchanged
                return load;
            });
            return updated;
        });
    }, [element.span]);
    // Recompute all load combinations whenever applied loads or combinations change
    useEffect(() => {
        setElement(prev => recomputeAllLoadCombinations(prev));
    }, [element.appliedLoads, element.loadCombinations]);
    
    // Update local element state when parent passes new elementData (e.g., with design results)
    useEffect(() => {
        // Always update if the incoming elementData has design results to ensure latest API results are shown 
        if (elementData.designResults && elementData.designResults.length > 0) {
            // Create a timestamp-based comparison to detect if results are newer
            const incomingTimestamp = JSON.stringify(elementData.designResults);
            const currentTimestamp = element.designResults ? JSON.stringify(element.designResults) : '';
            
            if (incomingTimestamp !== currentTimestamp) {
                console.log('Updating element with new design results from parent:', elementData.designResults);
                setElement(elementData);
            }
        }
    }, [elementData.designResults]);

    // Sync isSaved state when elementData changes
    useEffect(() => {
        setIsSaved(elementData.isSaved || false);
    }, [elementData.isSaved]);
    //#endregion


    //#region Form Handlers
    /**
    *  Handles changes to the main element properties.
    */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement >) => {
        const { name, value } = e.target;
        const isNumeric = ['span', 'spacing', 'section_count'].includes(name);
        const newValue = isNumeric ? Number(value) : value;

        setElement(prev => {
            const newElement = { ...prev, [name]: newValue };
            // If the span changes, automatically update the position of the last support if it's a roller.
            if (name === 'span' && newElement.supports.length > 0) {
            const lastSupportIndex = newElement.supports.length - 1;
                //if (newElement.supports[lastSupportIndex].fixity === SupportFixityType.Roller) {
                    newElement.supports[lastSupportIndex].position = Number(value);
                //}
            }
            // When span changes, also set lateralRestraintSpacing to match
            if (name === 'span') {
                newElement.designParameters = {
                    ...(prev.designParameters as DesignParameters),
                    lateralRestraintSpacing: Number(value),
                } as DesignParameters;
            }
            
            return newElement;
        });
    };
    
    const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedSectionName = e.target.value;
        const selectedSection = sections.find(s => s.name === selectedSectionName);
        if (selectedSection) {
            setElement(prev => ({
                ...prev,
                sectionName: selectedSection.name,
                sections: [selectedSection] // Populate the sections array with the full section object
            }));
        }
    };


    /**
     * This function handles the form cancellation.
     */
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
    };


    /**
     * This function handles the form submission. i.e. Beam Analysis and Design
     */
    const handleSubmit = () => {
        // First, recompute all load combinations with current applied loads to ensure freshest data
        const updatedElement = recomputeAllLoadCombinations(element);
        
        // Update local state with the recomputed element
        setElement(updatedElement);
        
        // Reset isSaved to false so button shows "Save" instead of "Update" after design
        setIsSaved(false);
        
        // Send the updated element with fresh load combinations to parent for API call
        onSubmit(updatedElement);
    };
    
    /**
     * This function handles the form saving.
     */
    const handleSave = async () => {
        try {
            await onSave(element);
            // Only set isSaved to true after successful save
            // The parent component will update the elementData with isSaved: true
            // which will trigger the useEffect to update our local state
            
             
        } catch (error) {
            // Handle save errors if needed
            console.error('Save failed:', error);
        }
    };
    //#endregion

    //#region Support Handlers

    /**
     * Handles changes to individual support properties.
     */
    const handleSupportChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newSupports = [...element.supports];
        const newSupport = { ...newSupports[index], [name]: name === 'position' ? Number(value) : value };
        newSupports[index] = newSupport;
        setElement(prev => ({ ...prev, supports: newSupports }));
    };

    const addSupport = () => setElement(prev => ({...prev, supports: [...prev.supports, { position: prev.span, fixity: SupportFixityType.Roller }]}));
    
    const removeSupport = (index: number) => setElement(prev => ({...prev, supports: prev.supports.filter((_, i) => i !== index)}));
   
    //#endregion

    //#region Load Handlers
     /**
     * Handles changes to individual applied load properties.
     */
    const handleLoadTypeChange = (loadIndex: number, newType: LoadType) => {
        setElement(prev => {
            const newAppliedLoads = [...prev.appliedLoads];
            const currentLoad = { ...newAppliedLoads[loadIndex] };
            
            currentLoad.type = newType;
    
            // Reset position to sensible defaults
            if (newType === LoadType.PointLoad) {
                currentLoad.position = [String(element.span / 2)];
            } else { // For UDL and Trapezoidal
                currentLoad.position = ['0', String(element.span)];
            }
    
            // Adjust forces array based on new type
             currentLoad.forces = currentLoad.forces.map(force => {
                let newMag = [...force.magnitude];
                if (newType === LoadType.TrapezoidalLoad) {
                    if (newMag.length === 1) newMag = [newMag[0], newMag[0]];
                } else {
                    if (newMag.length > 1) newMag = [newMag[0]];
                }
                return {...force, magnitude: newMag};
            });
            
            newAppliedLoads[loadIndex] = currentLoad;
            return { ...prev, appliedLoads: newAppliedLoads };
        });
    };

    const handleAppliedLoadChange = (loadIndex: number, forceIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setElement(prev => {
            const newAppliedLoads = [...prev.appliedLoads];
            const newForces = [...newAppliedLoads[loadIndex].forces];
            newForces[forceIndex] = { ...newForces[forceIndex], [name]: value };
            newAppliedLoads[loadIndex] = { ...newAppliedLoads[loadIndex], forces: newForces };
            return { ...prev, appliedLoads: newAppliedLoads };
        });
    };

    /**
     * Handles changes to a load's magnitude value(s). User input is in kN, state is in N.
     */
    const handleLoadMagnitudeChange = (loadIndex: number, forceIndex: number, magnitudeIndex: number, value: string) => {
        setElement(prev => {
            const newLoads = [...prev.appliedLoads];
            const newForces = [...newLoads[loadIndex].forces];
            const newMagnitudes = [...newForces[forceIndex].magnitude];
            newMagnitudes[magnitudeIndex] = Number(value) * 1000; // Convert kN input to N
            newForces[forceIndex] = { ...newForces[forceIndex], magnitude: newMagnitudes };
            newLoads[loadIndex] = { ...newLoads[loadIndex], forces: newForces };
            return { ...prev, appliedLoads: newLoads };
        });
      };
    
      // Handles changes to the position of a load.
    const handleLoadPositionChange = (loadIndex: number, posIndex: number, value: string) => {
        setElement(prev => {
            const newLoads = [...prev.appliedLoads];
            const newPositions = [...newLoads[loadIndex].position];
            newPositions[posIndex] = value;
            newLoads[loadIndex] = { ...newLoads[loadIndex], position: newPositions };
            return { ...prev, appliedLoads: newLoads };
        });
    };
    
    const addAppliedLoad = () => {
        setElement(prev => ({
            ...prev,
            appliedLoads: [
                ...prev.appliedLoads,
                {
                    type: LoadType.UDL,
                    position: ['0', String(prev.span)],
                    forces: [
                        { magnitude: [0], loadCase: LoadCaseType.Dead },
                        { magnitude: [0], loadCase: LoadCaseType.Live }
                    ]
                }
            ]
        }));
    };

    const removeAppliedLoad = (index: number) => {
        setElement(prev => ({
            ...prev,
            appliedLoads: prev.appliedLoads.filter((_, i) => i !== index)
        }));
    };
    
    const addForceToLoad = (loadIndex: number) => {
        setElement(prev => {
            const newLoads = [...prev.appliedLoads];
            const load = newLoads[loadIndex];
            const existingCases = new Set(load.forces.map(f => f.loadCase));
            const availableCase = Object.values(LoadCaseType).find(lc => !existingCases.has(lc));
            if (availableCase) {
                const magnitudeLength = load.type === LoadType.TrapezoidalLoad ? 2 : 1;
                load.forces.push({
                    magnitude: Array(magnitudeLength).fill(0),
                    loadCase: availableCase
                });
            }
            return { ...prev, appliedLoads: newLoads };
        });
    };

    const removeForceFromLoad = (loadIndex: number, forceIndex: number) => {
        setElement(prev => {
            const newLoads = [...prev.appliedLoads];
            newLoads[loadIndex].forces = newLoads[loadIndex].forces.filter((_, i) => i !== forceIndex);
            return { ...prev, appliedLoads: newLoads };
        });
    };
    //#endregion

    //#region Load Combination Handlers
    const handleCombinationChange = (comboIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setElement(prev => {
            const newCombinations = [...prev.loadCombinations];
            newCombinations[comboIndex] = { ...newCombinations[comboIndex], [name]: value };
            return { ...prev, loadCombinations: newCombinations };
        });
    };

    const addCombination = () => {
        setElement(prev => ({
            ...prev,
            loadCombinations: [
                ...prev.loadCombinations,
                {
                    name: `New Combo ${prev.loadCombinations.length + 1}`,
                    combinationType: 'Ultimate',
                    loadCaseFactors: []
                }
            ]
        }));
    };

    const removeCombination = (index: number) => {
        setElement(prev => ({
            ...prev,
            loadCombinations: prev.loadCombinations.filter((_, i) => i !== index)
        }));
    };

    const handleFactorChange = (comboIndex: number, factorIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['factor', 'termFactor'].includes(name);
        setElement(prev => {
            const newCombinations = [...prev.loadCombinations];
            const newFactors = [...newCombinations[comboIndex].loadCaseFactors];
            newFactors[factorIndex] = { ...newFactors[factorIndex], [name]: isNumeric ? Number(value) : value };
            newCombinations[comboIndex] = { ...newCombinations[comboIndex], loadCaseFactors: newFactors };
            return { ...prev, loadCombinations: newCombinations };
        });
    };

    const addFactor = (comboIndex: number) => {
        setElement(prev => {
            const newCombinations = [...prev.loadCombinations];
            const combo = newCombinations[comboIndex];
            combo.loadCaseFactors.push({
                loadCaseType: LoadCaseType.Dead,
                factor: 1.0,
                termFactor: 1.0,
            });
            return { ...prev, loadCombinations: newCombinations };
        });
    };

    const removeFactor = (comboIndex: number, factorIndex: number) => {
        setElement(prev => {
            const newCombinations = [...prev.loadCombinations];
            const combo = newCombinations[comboIndex];
            combo.loadCaseFactors = combo.loadCaseFactors.filter((_, i) => i !== factorIndex);
            return { ...prev, loadCombinations: newCombinations };
        });
    };
    //#endregion

    // Helper: Validation for support/load positions
    const isSupportPositionInvalid = (pos: number) => pos > element.span;
    const isLoadPositionInvalid = (pos: string) => Number(pos) > element.span;
    const hasDuplicateSupportPositions = () => {
        const positions = element.supports.map(s => s.position);
        return new Set(positions).size !== positions.length;
    };
    const anySupportInvalid = element.supports.some(s => isSupportPositionInvalid(s.position)) || hasDuplicateSupportPositions();
    const anyLoadInvalid = element.appliedLoads.some(l => l.position.some(isLoadPositionInvalid));
    const formHasError = anySupportInvalid || anyLoadInvalid;

    // Find the governing design result to display in the main summary
    const governingResult = element.designResults && element.designResults.length > 0
        ? element.designResults.reduce((max, current) => {
            const maxUtil = Math.max(
                max.capacity_data.utilization.bending_strength,
                max.capacity_data.utilization.shear_strength
            );
            const currentUtil = Math.max(
                current.capacity_data.utilization.bending_strength,
                current.capacity_data.utilization.shear_strength
            );
            return currentUtil > maxUtil ? current : max;
        })
        : null;

    // FIX: Explicitly type the summary items array to prevent incorrect type inference.
    // TypeScript was inferring the `value` property as `LoadCombination[]`, which caused a type error
    // when trying to add a summary item with a `string[]` value for the governing result.
    const loadCombinationsSummaryItems: {
        label: string;
        value: any;
        unit?: string;
        arrayDisplayType?: 'count' | 'list' | 'first' | 'last';
        arrayProperty?: string;
        maxArrayItems?: number;
    }[] = [
        { label: 'Count', value: element.loadCombinations || [], arrayDisplayType: 'count' as const },
        { label: 'Types', value: element.loadCombinations || [], arrayDisplayType: 'list' as const, arrayProperty: 'combinationType', maxArrayItems: 2 },
        { label: 'Names', value: element.loadCombinations?.filter(c => c.name && c.name.trim() !== '') || [], arrayDisplayType: 'list' as const, arrayProperty: 'name', maxArrayItems: 2 }
    ];

    if (governingResult) {
        loadCombinationsSummaryItems.push({
            label: 'Governing',
            value: [`${governingResult.combinationName || 'N/A'} (B: ${(governingResult.capacity_data.utilization.bending_strength * 100).toFixed(0)}%, S: ${(governingResult.capacity_data.utilization.shear_strength * 100).toFixed(0)}%)`]
        });
    }


    if (!isFormActive) {
         return (
            <div className="p-3 text-sm italic text-gray-500 text-center border rounded-lg bg-gray-50">
                <p className="font-semibold">{elementData.name}</p>
                <p>Submitted for design.</p>
                <DesignResultsDisplay results={element.designResults || []} isVisible={!!element.designResults && element.designResults.length > 0} />
            </div>
        );
    }

    return (
        <div className="space-y-4 border p-4 rounded-xl shadow-sm bg-base-100">
            <h3 className="text-lg font-bold text-center text-neutral">{element.name}</h3>

            {/* General Properties Section */}
            <FormCollapsibleSectionWithStagedSummary title="General Properties" defaultStage="open" color="bg-gray-50/50" summaryItems={[
                {label: "Span", value: element.span, unit: "m"},
                {label: "Project", value: element.projectId ?? element.projectId, unit: "m"},
                {label: "Section", value: element.section_count+"/"+element.sectionName},
                {label: "Type", value: element.type},
                {label: "Spacing/Tributary", value: element.spacing, unit: "m"},
            ]}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    <div><label className={labelClasses}>Name</label><input name="name" value={element.name} onChange={handleChange} className={inputClasses} /></div>
                    
                    <div><label className={labelClasses}>Type</label><select name="type" value={element.type} onChange={handleChange} className={inputClasses}>{Object.values(ELEMENT_TYPE_OPTIONS).map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div><label className={labelClasses}>Span (m)</label><input name="span" type="number" step="any" value={element.span} onChange={handleChange} className={inputClasses} /></div>
                    <div>
                        <label className={labelClasses}>Segment Length/Restraint Spacing</label>
                        <input
                            name="lateralRestraintSpacing"
                            type="number"
                            step="any"
                            value={element.designParameters?.lateralRestraintSpacing ?? element.span}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...(prev.designParameters as DesignParameters),
                                    lateralRestraintSpacing: Number(e.target.value)
                                }
                            }))}
                            className={inputClasses}
                        />
                    </div>
                    <div><label className={labelClasses}>Section Count</label><input name="section_count" type="number" step="1" value={element.section_count} onChange={handleChange} className={inputClasses} /></div>
                    <div>
                        <label className={labelClasses}>Section Name</label>
                        <select name="sectionName" value={element.sectionName} onChange={handleSectionChange} className={inputClasses}>
                            <option value="" disabled>Select a section</option>
                            {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>Project</label>
                        <select name="projectId" value={element.projectId || ''} onChange={(e) => {
                            const selectedId = e.target.value;
                            const matched = projectData?.find(proj => proj.id === selectedId);
                            setElement(prev => ({ ...prev, projectId: matched?.id || '' }));
                        }} className={inputClasses}>
                            <option value="" disabled>Select Project</option>
                            {projectData?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div><label className={labelClasses}>Spacing/Tributary (m)</label><input name="spacing" type="number" step="any" value={element.spacing} onChange={handleChange} className={inputClasses} /></div>

                </div>
            </FormCollapsibleSectionWithStagedSummary>

            {/* Design Parameters Section */}
            <FormCollapsibleSectionWithStagedSummary 
                title="Design Parameters" 
                defaultStage="preview"
                color="bg-yellow-50/50"
                summaryItems={[
                    { label: 'Restraint', value: element.designParameters?.lateralRestraintSpacing?.toString() || '1', unit: 'm' },
                    { label: 'Country', value: element.designParameters?.countryOfStandard || 'New Zealand' },
                    { label: 'Material', value: element.designParameters?.materialType || 'Timber' }
                ]}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClasses}>Torsional Restraint Spacing</label>
                        <input
                            name="torsionalRestraintSpacing"
                            type="number"
                            value={element.designParameters?.torsionalRestraintSpacing ?? 1}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    torsionalRestraintSpacing: Number(e.target.value)
                                }
                            }))}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Country of Standard</label>
                        <input
                            name="countryOfStandard"
                            value={element.designParameters?.countryOfStandard ?? 'New Zealand'}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    countryOfStandard: e.target.value
                                }
                            }))}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Material Type</label>
                        <select
                            name="materialType"
                            value={element.designParameters?.materialType ?? MaterialType.Timber}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    materialType: e.target.value as MaterialType
                                }
                            }))}
                            className={inputClasses}
                        >
                            {Object.values(MaterialType).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>Member Count</label>
                        <input
                            name="memberCount"
                            type="number"
                            value={element.designParameters?.memberCount ?? 1}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    memberCount: Number(e.target.value)
                                }
                            }))}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Capacity Factor</label>
                        <input
                            name="capacityFactor"
                            type="number"
                            value={element.designParameters?.capacityFactor ?? 0.9}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    capacityFactor: Number(e.target.value)
                                }
                            }))}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Loading Scenario</label>
                        <input
                            name="loadingScenario"
                            type="number"
                            value={element.designParameters?.loadingScenario ?? 1}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    loadingScenario: Number(e.target.value)
                                }
                            }))}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Member Type</label>
                        <input
                            name="memberType"
                            value={element.designParameters?.memberType ?? 'solid timber'}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    memberType: e.target.value
                                }
                            }))}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Moisture Condition</label>
                        <select
                            name="moistureCondition"
                            value={element.designParameters?.moistureCondition ?? 'dry'}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    moistureCondition: e.target.value as 'dry' | 'wet' | 'moist'
                                }
                            }))}
                            className={inputClasses}
                        >
                            <option value="dry">dry</option>
                            <option value="wet">wet</option>
                            <option value="moist">moist</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>Temperature Condition</label>
                        <select
                            name="temperatureCondition"
                            value={element.designParameters?.temperatureCondition ?? 'normal'}
                            onChange={e => setElement(prev => ({
                                ...prev,
                                designParameters: {
                                    ...prev.designParameters!,
                                    temperatureCondition: e.target.value as 'normal' | 'elevated' | 'high'
                                }
                            }))}
                            className={inputClasses}
                        >
                            <option value="normal">normal</option>
                            <option value="elevated">elevated</option>
                            <option value="high">high</option>
                        </select>
                    </div>
                </div>
            </FormCollapsibleSectionWithStagedSummary>

            {/* Section Properties Section */}
            <FormCollapsibleSectionWithStagedSummary 
                title="Section Properties" 
                color="bg-purple-50/50" 
                defaultStage="preview"
                summaryItems={[
                    { label: '', value: element.section_count+" No" },
                    { label: 'Names', value: element.sections || [], arrayDisplayType: 'list', arrayProperty: 'name', maxArrayItems: 2 },
                    { label: 'Material', value: element.sections || [], arrayDisplayType: 'list', arrayProperty: 'material', maxArrayItems: 2 }
                ]}
            >
                {element.sections && element.sections.length > 0 ? (
                    element.sections.map((section, i) => {
                        const newSections = [...element.sections];
                        const updateField = (field: keyof SectionProperties, value: any) => {
                            newSections[i] = { ...newSections[i], [field]: value };
                            setElement(prev => ({ ...prev, sections: newSections }));
                        };
                        return (
                        <div key={i} className="space-y-4 max-h-96 overflow-y-auto">
                            {/* Basic Properties */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClasses}>Name</label>
                                    <input
                                        value={section.name}
                                        onChange={e => updateField('name', e.target.value)}
                                        className={inputClasses}
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>Material</label>
                                    <select
                                        name="material"
                                        value={section.material}
                                        onChange={e => updateField('material', e.target.value as MaterialType)}
                                        className={inputClasses}
                                    >
                                        {Object.values(MaterialType).map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Shape</label>
                                    <select
                                        name="shape"
                                        value={section.shape}
                                        onChange={e => updateField('shape', e.target.value as SectionShape)}
                                        className={inputClasses}
                                    >
                                        {Object.values(SectionShape).map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Material Grade</label>
                                    <input
                                        value={section.material_grade || ''}
                                        onChange={e => updateField('material_grade', e.target.value)}
                                        className={inputClasses}
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>Country</label>
                                    <input
                                        value={section.country || ''}
                                        onChange={e => updateField('country', e.target.value)}
                                        className={inputClasses}
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>Community</label>
                                    <input
                                        value={section.community || ''}
                                        onChange={e => updateField('community', e.target.value)}
                                        className={inputClasses}
                                    />
                                </div>
                            </div>

                            <FormCollapsibleSection title="Material & Strength Properties" color="bg-blue-50/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClasses}>Elastic Modulus E (MPa)</label>
                                        <input
                                            type="number"
                                            value={section.elastic_modulus_E || 0}
                                            onChange={e => updateField('elastic_modulus_E', Number(e.target.value))}
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Yield Strength (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.yield_strength || 0}
                                            onChange={e => updateField('yield_strength', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Ultimate Strength (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.ultimate_strength || 0}
                                            onChange={e => updateField('ultimate_strength', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Mass per Metre (kg/m)</label>
                                        <input 
                                            type="number" 
                                            value={section.mass_per_metre || 0}
                                            onChange={e => updateField('mass_per_metre', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Bending Parallel to Grain (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.Bending_Parallel_to_Grain || 0}
                                            onChange={e => updateField('Bending_Parallel_to_Grain', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Tension Parallel to Grain (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.Tension_parallel_to_Grain || 0}
                                            onChange={e => updateField('Tension_parallel_to_Grain', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Compression Parallel to Grain (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.Compression_parallel_to_Grain || 0}
                                            onChange={e => updateField('Compression_parallel_to_Grain', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Shear Parallel to Grain (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.Shear_Parallel_to_Grain || 0}
                                            onChange={e => updateField('Shear_Parallel_to_Grain', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Compression Perp. to Grain (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.compressopn_perpendicular_to_grain || 0}
                                            onChange={e => updateField('compressopn_perpendicular_to_grain', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Bearing Strength Perp. (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.Bearing_strength_perpendicular_to_grain || 0}
                                            onChange={e => updateField('Bearing_strength_perpendicular_to_grain', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Tension Perp. to Grain (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.Tension_perpendicular_to_grain || 0}
                                            onChange={e => updateField('Tension_perpendicular_to_grain', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Elastic Mod Short-Term (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.elastic_modulus_Short_term || 0}
                                            onChange={e => updateField('elastic_modulus_Short_term', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Elastic Mod Lower Bound (MPa)</label>
                                        <input 
                                            type="number" 
                                            value={section.elastic_modulus_Short_term_Lower_bound || 0}
                                            onChange={e => updateField('elastic_modulus_Short_term_Lower_bound', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                </div>
                            </FormCollapsibleSection>

                            <FormCollapsibleSection title="Geometric & Section Properties" color="bg-purple-50/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClasses}>Depth d (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.d}
                                            onChange={e => updateField('d', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Width b (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.b}
                                            onChange={e => updateField('b', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Wall Thickness t (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.t || 0}
                                            onChange={e => updateField('t', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Web Thickness (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.web_thickness || 0}
                                            onChange={e => updateField('web_thickness', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Flange Thickness (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.flange_thickness || 0}
                                            onChange={e => updateField('flange_thickness', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Ix (mm⁴)</label>
                                        <input 
                                            type="number" 
                                            value={section.Ix}
                                            onChange={e => updateField('Ix', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Iy (mm⁴)</label>
                                        <input 
                                            type="number" 
                                            value={section.Iy}
                                            onChange={e => updateField('Iy', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Zx (mm³)</label>
                                        <input 
                                            type="number" 
                                            value={section.Zx}
                                            onChange={e => updateField('Zx', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Zy (mm³)</label>
                                        <input 
                                            type="number" 
                                            value={section.Zy}
                                            onChange={e => updateField('Zy', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>A (mm²)</label>
                                        <input 
                                            type="number" 
                                            value={section.A}
                                            onChange={e => updateField('A', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>J (mm⁴)</label>
                                        <input 
                                            type="number" 
                                            value={section.J || 0}
                                            onChange={e => updateField('J', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Sx (mm³)</label>
                                        <input 
                                            type="number" 
                                            value={section.Sx || 0}
                                            onChange={e => updateField('Sx', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Sy (mm³)</label>
                                        <input 
                                            type="number" 
                                            value={section.Sy || 0}
                                            onChange={e => updateField('Sy', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>H (mm⁶)</label>
                                        <input 
                                            type="number" 
                                            value={section.H || 0}
                                            onChange={e => updateField('H', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>x (mm³)</label>
                                        <input 
                                            type="number" 
                                            value={section.x || 0}
                                            onChange={e => updateField('x', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>r (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.r || 0}
                                            onChange={e => updateField('r', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>d1 (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.d1 || 0}
                                            onChange={e => updateField('d1', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Cw (mm⁶)</label>
                                        <input 
                                            type="number" 
                                            value={section.Cw || 0}
                                            onChange={e => updateField('Cw', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>rx (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.rx || 0}
                                            onChange={e => updateField('rx', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>ry (mm)</label>
                                        <input 
                                            type="number" 
                                            value={section.ry || 0}
                                            onChange={e => updateField('ry', Number(e.target.value))} 
                                            className={inputClasses} 
                                        />
                                    </div>
                                </div>
                            </FormCollapsibleSection>
                        </div>);
                    })
                ) : (
                    <div className="text-gray-500 text-sm">No section selected.</div>
                )}
            </FormCollapsibleSectionWithStagedSummary>

            {/* Supports Section */}
            <FormCollapsibleSectionWithStagedSummary title="Supports" defaultStage="preview" color="bg-sky-50/50" 
                summaryItems={[
                {label: "Count", value: element.supports.length},
                {label: "Types", value: element.supports, arrayDisplayType: 'list', arrayProperty: 'fixity', maxArrayItems: 3},
                {label: 'Positions', value: element.supports, arrayDisplayType: 'list', arrayProperty: 'position', maxArrayItems: 2, unit: 'm' }

            ]}>
                {element.supports.map((support, index) => (
                    <div key={index} className="p-3 bg-secondary border border-sky-200 rounded-lg grid grid-cols-[1fr_1fr_auto] gap-3 items-center mb-2">
                        <div>
                            <label className={labelClasses}>Position (m)</label>
                            <input 
                                type="number" 
                                step="any" 
                                name="position" 
                                value={support.position} 
                                onChange={(e) => handleSupportChange(index, e)} 
                                className={`${inputClasses} ${isSupportPositionInvalid(support.position) || (element.supports.filter(sup => sup.position === support.position).length > 1) ? 'border-red-500' : ''}`} 
                            />
                            {isSupportPositionInvalid(support.position) && <p className="text-xs text-red-500 mt-1">Position ({support.position}) &gt; Span ({element.span})</p>}
                            {(element.supports.filter(sup => sup.position === support.position).length > 1) && <p className="text-xs text-red-500 mt-1">Duplicate support position</p>}
                        </div>
                        <div><label className={labelClasses}>Fixity</label><select name="fixity" value={support.fixity} onChange={(e) => handleSupportChange(index, e)} className={inputClasses}>{Object.values(SupportFixityType).map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                        <button type="button" onClick={() => removeSupport(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50 self-end mb-1" disabled={element.supports.length === 1}><RemoveIcon className="w-6 h-6"/></button>
                    </div>
                ))}
                <button type="button" onClick={addSupport} className="w-full mt-2 flex items-center justify-center gap-2 text-sm font-semibold p-2 border-2 border-dashed border-gray-300 rounded-lg text-sky-700 hover:border-sky-500 hover:bg-sky-50"><AddIcon className="w-5 h-5"/> Add Support</button>
                {hasDuplicateSupportPositions() && (
                <div className="text-xs text-red-500 mt-1">Two supports cannot have the same position.</div>
                )}
            </FormCollapsibleSectionWithStagedSummary>

            {/* Applied Loads Section */}
            <FormCollapsibleSectionWithStagedSummary title="Applied Loads" color="bg-teal-50/50" enableDoubleClickExpand={true} defaultStage="open"
                summaryItems={[
                    { label: 'Count', value: element.appliedLoads, arrayDisplayType: 'count' },
                    { label: 'Types', value: element.appliedLoads, arrayDisplayType: 'list', arrayProperty: 'type', maxArrayItems: 3 },
                    { label: 'Load Cases', value: element.appliedLoads.flatMap(load => load.forces.map(f => f.loadCase)), arrayDisplayType: 'list', maxArrayItems: 3 },
                    { label: 'Magnitudes', value: element.appliedLoads.flatMap(load => load.forces.map(f => formatMagnitudeWithUnit(f.magnitude, load.type))), arrayDisplayType: 'list', maxArrayItems: 3 }
                ]}>
                 <div className="space-y-3">
                    {element.appliedLoads.map((load, loadIndex) => (
                        <FormCollapsibleSectionWithStagedSummary
                            key={loadIndex}
                            title={`Applied Load ${loadIndex + 1}`}
                            defaultStage="preview"
                            enableDoubleClickExpand={true}
                            color="bg-green-100/50"
                            summaryItems={[
                                { label: '', value: `${load.forces.length} No force(s)` },
                                { label: 'Type', value: load.type },
                                { label: 'Position', value: load.position.join('-'), unit: 'm' },
                                { label: 'Cases', value: load.forces, arrayDisplayType: 'list', arrayProperty: 'loadCase', maxArrayItems: 2 },
                                { label: 'Mag.', value: load.forces.map(force => formatMagnitudeWithUnit(force.magnitude, load.type)), arrayDisplayType: 'list', maxArrayItems: 3 }
                            ]}
                        >
                            <div className="flex flex-col gap-3 p-3 bg-green-50/50 rounded-lg">
                                {/* Load Type and Remove Button */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <label className={labelClasses}>Load Type</label>
                                        <select value={load.type} onChange={(e) => handleLoadTypeChange(loadIndex, e.target.value as LoadType)} className={inputClasses}>
                                            {Object.values(LoadType).map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <button type="button" onClick={() => removeAppliedLoad(loadIndex)} className="text-red-500 hover:text-red-700 mt-1" disabled={element.appliedLoads.length <= 1}>
                                        <RemoveIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                                
                                {/* Load Position */}
                                <div>
                                    <label className={labelClasses}>Position (m)</label>
                                    <div className={load.type !== LoadType.PointLoad ? "grid grid-cols-2 gap-3" : ""}>
                                        {load.position.map((pos, posIndex) => (
                                            <div key={posIndex}>
                                                <input type="text" value={pos} onChange={(e) => handleLoadPositionChange(loadIndex, posIndex, e.target.value)} className={`${inputClasses} ${isLoadPositionInvalid(pos) ? 'border-red-500' : ''}`} placeholder={load.type === LoadType.PointLoad ? 'Position' : (posIndex === 0 ? 'Start' : 'End')}/>
                                                {isLoadPositionInvalid(pos) && <p className="text-xs text-red-500 mt-1">Position must be within span ({element.span}m).</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Forces Section */}
                                <div className="space-y-2 pt-2 border-t border-teal-200">
                                    <label className="text-sm font-semibold text-gray-800">Forces</label>
                                    {load.forces.map((force, forceIndex) => {
                                        const forceGridCols = load.type === LoadType.TrapezoidalLoad ? 'grid-cols-1 md:grid-cols-[2fr_2fr_1.5fr_auto]' : 'grid-cols-1 md:grid-cols-[1.5fr_1fr_auto]';
                                        return (
                                            <div key={forceIndex} className={`grid ${forceGridCols} gap-3 items-end p-2 bg-white/50 rounded border`}>
                                                {/* Magnitudes */}
                                                {load.type === LoadType.TrapezoidalLoad ? (
                                                    <>
                                                        <div>
                                                            <label className={labelClasses}>Start Mag (kN/m)</label>
                                                            <input type="number" step="any" value={force.magnitude[0] / 1000} onChange={(e) => handleLoadMagnitudeChange(loadIndex, forceIndex, 0, e.target.value)} className={inputClasses}/>
                                                        </div>
                                                        <div>
                                                            <label className={labelClasses}>End Mag (kN/m)</label>
                                                            <input type="number" step="any" value={(force.magnitude[1] ?? force.magnitude[0]) / 1000} onChange={(e) => handleLoadMagnitudeChange(loadIndex, forceIndex, 1, e.target.value)} className={inputClasses}/>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div>
                                                        <label className={labelClasses}>Mag ({load.type === LoadType.PointLoad ? 'kN' : 'kN/m'})</label>
                                                        <input type="number" step="any" value={force.magnitude[0] / 1000} onChange={(e) => handleLoadMagnitudeChange(loadIndex, forceIndex, 0, e.target.value)} className={inputClasses}/>
                                                    </div>
                                                )}
                                                
                                                {/* Load Case */}
                                                <div>
                                                    <label className={labelClasses}>Load Case</label>
                                                    <select name="loadCase" value={force.loadCase} onChange={(e) => handleAppliedLoadChange(loadIndex, forceIndex, e)} className={inputClasses}>
                                                        {Object.values(LoadCaseType).map(lc => <option key={lc} value={lc}>{lc}</option>)}
                                                    </select>
                                                </div>

                                                {/* Remove button */}
                                                <button type="button" onClick={() => removeForceFromLoad(loadIndex, forceIndex)} className="text-red-500 hover:text-red-700" disabled={load.forces.length <= 1}>
                                                    <RemoveIcon className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button type="button" onClick={() => addForceToLoad(loadIndex)} className="w-full text-xs text-center p-1 border-dashed border-2 rounded text-teal-800 hover:bg-teal-100">+ Add Force</button>
                                </div>
                                
                                {/* Combination Results Display */}
                                {element.loadCombinations && element.loadCombinations.length > 0 && (
                                    <div className="mt-3 p-2 bg-yellow-50/30 rounded border">
                                        <label className="text-sm font-semibold text-gray-800 mb-2 block">Combination Results for this Load</label>
                                        <div className="space-y-1">
                                            {element.loadCombinations.map((combo, combIdx) => {
                                                const loadResult = combo.computedResult && combo.computedResult[loadIndex];
                                                if (!loadResult || loadResult.magnitude.length === 0 || loadResult.magnitude.every(mag => mag === 0)) {
                                                    return null;
                                                }
                                                return (
                                                    <div key={combIdx} className="text-xs p-2 bg-white rounded border flex justify-between items-center">
                                                        <span className="font-medium text-gray-700">{combo.name}:</span>
                                                        <span className="text-gray-600 font-mono">{formatMagnitudeWithUnit(loadResult.magnitude, loadResult.type)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </FormCollapsibleSectionWithStagedSummary>
                    ))}
                    <button type="button" onClick={addAppliedLoad} className="w-full mt-2 flex items-center justify-center gap-2 text-sm font-semibold p-2 border-2 border-dashed border-gray-300 rounded-lg text-teal-700 hover:border-teal-500 hover:bg-teal-50"><AddIcon className="w-5 h-5"/> Add Applied Load</button>
                 </div>
            </FormCollapsibleSectionWithStagedSummary>

            {/* Load Combinations Section */}
            <FormCollapsibleSectionWithStagedSummary
                title="Load Combinations"
                defaultStage="open"
                enableDoubleClickExpand={true}  
                color="bg-violet-50/50"
                summaryItems={loadCombinationsSummaryItems}
            >
                <div className="space-y-2">
                    {element.loadCombinations && element.loadCombinations.length > 0 ? (
                        element.loadCombinations.map((combo, idx) => (
                            <FormCollapsibleSectionWithStagedSummary
                                key={idx}
                                title={combo.name || `Load Combination ${idx + 1}`}
                                defaultStage="preview"
                                enableDoubleClickExpand={true}
                                color="bg-violet-50/50"
                                summaryItems={[
                                    { label: 'Type', value: combo.combinationType || 'Ultimate' },
                                    { label: 'Factors', value: combo.loadCaseFactors || [], arrayDisplayType: 'count' },
                                    { label: 'Cases', value: combo.loadCaseFactors || [], arrayDisplayType: 'list', arrayProperty: 'loadCaseType', maxArrayItems: 2 },
                                    { label: 'Factors', value: combo.loadCaseFactors?.map(f => f.factor) || [], arrayDisplayType: 'list', maxArrayItems: 3 },
                                    { 
                                        label: 'Results', 
                                        value: combo.computedResult?.length > 0 
                                            ? combo.computedResult.map(r => formatMagnitudeWithUnit(r.magnitude, r.type as LoadType))
                                            : ['N/A'],
                                        arrayDisplayType: 'list'
                                    }
                                ]}
                            >
                            <div className="p-3 bg-white rounded border space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                    <input
                                        name="name"
                                        value={combo.name}
                                        onChange={e => handleCombinationChange(idx, e)}
                                        placeholder="Combination Name"
                                        className={inputClasses}
                                    />
                                     
                                    <select
                                        name="combinationType"
                                        value={combo.combinationType || 'Ultimate'}
                                        onChange={e => handleCombinationChange(idx, e)}
                                        className={inputClasses}
                                    >
                                        <option value="Ultimate">Ultimate</option>
                                        <option value="Serviceability">Serviceability</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <div className="flex items-center gap-2 justify-self-end">
                                        <input
                                            name="codeReference"
                                            value={combo.codeReference || ''}
                                            onChange={e => handleCombinationChange(idx, e)}
                                            placeholder="Code Ref."
                                            className={inputClasses}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeCombination(idx)}
                                            className="btn-icon text-red-500"
                                            disabled={element.loadCombinations.length === 1}
                                        >
                                            <RemoveIcon />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-violet-600">Load Case Factors</div>
                                    {(!combo.loadCaseFactors || combo.loadCaseFactors.length === 0) && (
                                        <div className="text-gray-400 text-xs p-2">No factors defined for this combination.</div>
                                    )}
                                    {combo.loadCaseFactors && combo.loadCaseFactors.map((f, fIdx) => (
                                        <div key={fIdx} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2 p-2 rounded border bg-violet-50/30 items-end">
                                            <div>
                                                <label className={labelClasses}>Load Case</label>
                                                <select name="loadCaseType" value={f.loadCaseType} onChange={e => handleFactorChange(idx, fIdx, e)} className={inputClasses}>
                                                    {Object.values(LoadCaseType).map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Factor</label>
                                                <input name="factor" type="number" value={f.factor} onChange={e => handleFactorChange(idx, fIdx, e)} className={inputClasses}/>
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Term Factor</label>
                                                <input name="termFactor" type="number" value={f.termFactor} onChange={e => handleFactorChange(idx, fIdx, e)} className={inputClasses} />
                                            </div>
                                            <button type="button" onClick={() => removeFactor(idx, fIdx)} className="btn-icon text-red-500 disabled:text-gray-400">
                                                <RemoveIcon />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addFactor(idx)} className="btn-add text-xs"><AddIcon /> Add Factor</button>
                                </div>

                                <button
                                    type="button"
                                    disabled={!combo.computedResult || combo.computedResult.length === 0 || combo.computedResult.every(load => load.magnitude.length === 0 || load.magnitude.every(mag => mag === 0))}
                                    onClick={() => setShowResults(prev => ({ ...prev, [combo.id || `combo-${idx}`]: !prev[combo.id || `combo-${idx}`] }))}
                                    className={`btn-add text-sm ${(!combo.computedResult || combo.computedResult.length === 0 || combo.computedResult.every(load => load.magnitude.length === 0 || load.magnitude.every(mag => mag === 0))) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {showResults[combo.id || `combo-${idx}`] ? 'Hide' : 'Show'} Computed Results
                                </button>
                                
                                {showResults[combo.id || `combo-${idx}`] && combo.computedResult && combo.computedResult.length > 0 && !combo.computedResult.every(load => load.magnitude.length === 0 || load.magnitude.every(mag => mag === 0)) && (
                                    <div className="mt-2 p-3 bg-violet-50/40 rounded border text-sm space-y-2">
                                        <div className="font-semibold text-violet-700 mb-2">Load Combination Results</div>
                                        {combo.computedResult.map((result, rIdx) => (
                                            <div key={rIdx} className="p-2 bg-white rounded border">
                                                <div className="flex flex-wrap gap-4 justify-between items-center">
                                                    <span><strong>Load #{rIdx + 1}:</strong> {result.type}</span>
                                                    <span><strong>Position:</strong> {result.position.join(' - ')} m</span>
                                                    <span><strong>Magnitude:</strong> {formatMagnitudeWithUnit(result.magnitude, result.type)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            </FormCollapsibleSectionWithStagedSummary>
                        ))
                    ) : (
                        <div className="text-gray-500 text-sm p-4">No load combinations defined.</div>
                    )}
                    <button
                        type="button"
                        onClick={addCombination}
                        className="w-full mt-2 flex items-center justify-center gap-2 text-sm font-semibold p-2 border-2 border-dashed border-gray-300 rounded-lg text-violet-700 hover:border-violet-500 hover:bg-violet-50"
                    >
                        <AddIcon className="w-5 h-5"/> Add Load Combination
                    </button>
                </div>
            </FormCollapsibleSectionWithStagedSummary>

            

             {/* Design Results Display */}
            {element.designResults && element.designResults.length > 0 && (
                <DesignResultsDisplay 
                    results={element.designResults} 
                    isVisible={true} 
                />
            )}

            {/* Status Message Area */}
            {statusMessage && (
                <div className={`p-4 rounded-lg border-l-4 mt-4 ${
                    statusMessage.type === 'loading' ? 'bg-blue-50 border-blue-400 text-blue-800' :
                    statusMessage.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                    statusMessage.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
                    'bg-gray-50 border-gray-400 text-gray-800'
                }`}>
                    <div className="flex items-center">
                        {statusMessage.type === 'loading' && (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {statusMessage.type === 'success' && (
                            <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        )}
                        {statusMessage.type === 'error' && (
                            <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        )}
                        <div>
                            <p className="font-medium">{statusMessage.message}</p>
                            {statusMessage.timestamp && (
                                <p className="text-sm opacity-75">{statusMessage.timestamp}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons Section*/}
            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                {onCancel && <button type="button" onClick={handleCancel} className="px-5 py-2.5 bg-gray-200 text-neutral font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>}
                <button type="button" onClick={handleSave} disabled={statusMessage?.type === 'loading'} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                    <SaveIcon className="w-5 h-5"/> {isSaved ? 'Update' : 'Save'}
                </button>
                <button type="button" onClick={handleSubmit} className="px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-focus transition-colors">Design Element</button>
            </div>
            
           
            <style>{`
                .btn-icon {
                    padding: 0.25rem;
                    border-radius: 9999px;
                    transition: background-color 0.2s;
                }
                .btn-icon:hover {
                    background-color: rgba(0,0,0,0.1);
                }
                 .btn-add {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.25rem 0.75rem;
                    border: 1px dashed #9ca3af;
                    border-radius: 0.5rem;
                    color: #1d4ed8;
                    font-weight: 500;
                    transition: all 0.2s;
                 }
                 .btn-add:hover {
                    background-color: #dbeafe;
                    border-color: #3b82f6;
                 }
            `}</style>
        </div>
    );
};

export default StructuralElementForm;