// components/Engineering/StructuralElementForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Element, LoadType, SupportFixityType, LoadCaseType, LoadCombination, LoadCaseFactor, LoadCombinationUtils, Load, DesignParameters, DesignOutput  } from '../../customTypes/structuralElement';
import { ELEMENT_TYPE_OPTIONS } from '../../customTypes/structuralElement';
// Ensure ELEMENT_TYPE_OPTIONS is exported as a default array from structuralElement.ts
import { AddIcon, RemoveIcon, SaveIcon } from '../utility/icons';
 import { FormCollapsibleSectionWithStagedSummary, FormCollapsibleSection } from '../utility/CollapsibleSection';
import { MaterialType, SectionShape, SectionProperties } from '../../customTypes/SectionProperties';
import { Project } from '../../customTypes/types';
import { DesignResultsDisplay } from './DesignResultsDisplay';
import { projectTransferRegistry } from '../../services/projectTransferRegistry';
import { projectService } from '../../services/projectService';
import { designAllCombinations } from '../../services/analysisService';
import TextEditor, { TextEditorHandle } from '../utility/TextEditor';
 
 
 
 
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
    onChange?: (data: Element) => void; // Optional: Makes the component "controlled" for live updates
    sections: SectionProperties[]; // Changed from sectionData to sections
    projectData?: Project[];
    wasCancelledProp?: boolean; // Let parent control cancel state
    statusMessage?: StatusMessage | null; // Status messages from parent
    onPin?: () => void; // optional callback to pin this form's element to the Canvas
    onAddTextEditorContent?: (content: string, type?: 'ai-insight' | 'analysis-result' | 'general') => void; // Allow parent to add content
    onRegisterDownload?: (downloadCallback: () => void) => void; // Callback to register download function
}

const inputClasses = "block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-teal-200/50";
const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

const StructuralElementForm: React.FC<StructuralElementFormProps> = ({
    elementData, elementDataList, isFormActive, onSubmit, onCancel, onSave, onChange, sections, projectData, statusMessage, onPin, onAddTextEditorContent, onRegisterDownload }) => {
    
    //#region Variables & Constants
    const [element, setElement] = useState<Element>(elementData);
    const [showResults, setShowResults] = useState<{[id: string]: boolean}>({});
    const [isSaved, setIsSaved] = useState<boolean>(elementData.isSaved || false);
    
    // A component is "controlled" if an `onChange` prop is provided.
    const isControlled = onChange !== undefined;
    
    // Track if this is the initial render to avoid calling onChange on mount
    const isInitialRender = useRef(true);
    const previousElementRef = useRef<Element>(elementData);
    const lastOnChangeElementRef = useRef<string>('');
    
    // Helper function to update element state and notify parent if controlled
    const updateElement = (updater: (prev: Element) => Element) => {
        setElement(prev => {
            const newElement = updater(prev);
            return newElement;
        });
    };
    
    // Mark that initial render is complete after first useEffect
    useEffect(() => {
        isInitialRender.current = false;
    }, []);
    
    // Handle onChange callback separately to avoid infinite loops
    useEffect(() => {
        if (!isInitialRender.current && isControlled && onChange) {
            const elementString = JSON.stringify(element);
            // Only call onChange if the element actually changed since last onChange call
            if (elementString !== lastOnChangeElementRef.current) {
                lastOnChangeElementRef.current = elementString;
                onChange(element);
            }
        }
    }, [element, isControlled, onChange]);
    
    // Sync with external elementData changes (without triggering onChange)
    useEffect(() => {
        // Deep compare the incoming prop with the current state to avoid loops.
        // Only update if the elementData from the parent is truly different.
        if (JSON.stringify(elementData) !== JSON.stringify(element)) {
            setElement(elementData);
        }
    }, [elementData]);
    
    // State for the custom combobox
    const [sectionSearchText, setSectionSearchText] = useState(element?.sectionName || '');
    const [filteredSections, setFilteredSections] = useState<SectionProperties[]>([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const comboboxRef = useRef<HTMLDivElement>(null);

    // Transfer UI state
    const [newLoadSourceMode, setNewLoadSourceMode] = useState<'manual' | 'fromProjectReaction'>('manual');
    const [reactionSourceElementId, setReactionSourceElementId] = useState<string>('');
    const [reactionSourceSupportIndex, setReactionSourceSupportIndex] = useState<number | ''>('');
    
    // Helper to filter out reaction combinations from UI display  
    const visibleLoadCombinations = element?.loadCombinations?.filter(
        combination => combination.combinationType !== 'Reaction'
    ) || [];
    
    // Candidate source elements: saved elements in the same project (exclude self)
    const [fetchedCandidateElements, setFetchedCandidateElements] = useState<any[]>([]);
    
    // Text Editor state
    const [textEditorContent, setTextEditorContent] = useState<any[]>(
        elementData.documentContent || [
            {
                type: 'paragraph',
                children: [{ text: 'Element analysis and Design output...' }],
            },
        ]
    );
    const textEditorRef = useRef<TextEditorHandle>(null);
    const [hasUnsavedDocumentChanges, setHasUnsavedDocumentChanges] = useState(false);
    //#endregion








    //#region Effect Hooks
    
    // Fetch project elements for transfer candidates
    useEffect(() => {
        let mounted = true;
        // If parent didn't pass an elementDataList, try fetching project elements for this element's project
        if ((!elementDataList || elementDataList.length === 0) && element?.projectId) {
            projectService.getProjectElements(element.projectId).then(els => {
                if (!mounted) return;
                setFetchedCandidateElements(els || []);
            }).catch(err => {
                console.warn('Failed to fetch project elements for transfer candidates', err);
            });
        }
        return () => { mounted = false; };
    }, [element?.projectId, elementDataList]);

    const candidateElements: any[] = (elementDataList && elementDataList.length > 0 ? elementDataList : fetchedCandidateElements).filter(el => el.id && el.projectId && el.projectId === element?.projectId && el.id !== element?.id);
    const selectedSourceElement: any | undefined = candidateElements.find((p: any) => p.id === reactionSourceElementId);
    const selectedSourceSupports: any[] = selectedSourceElement?.supports || [];

    // Subscribe to any transfer groups referenced by this element so updates propagate
    useEffect(() => {
        if (!element?.appliedLoads) return;
        
        const unsubscribers: Array<() => void> = [];
        
        // Create a stable reference to the transfer group IDs to avoid re-subscribing unnecessarily
        const transferGroups = element.appliedLoads
            .map(load => (load as any).transfer)
            .filter(tg => tg && tg.transferGroupId && tg.projectId)
            .map(tg => ({ projectId: tg.projectId, transferGroupId: tg.transferGroupId }));
        
        transferGroups.forEach(({ projectId, transferGroupId }) => {
            const unsub = projectTransferRegistry.subscribe(projectId, transferGroupId, (canonical) => {
                updateElement(prev => {
                    const idx = prev.appliedLoads.findIndex(l => (l as any).transfer?.transferGroupId === canonical.transfer!.transferGroupId);
                    if (idx === -1) return prev;
                    
                    // Only update if the data actually changed to prevent infinite loops
                    const currentLoad = prev.appliedLoads[idx];
                    if (JSON.stringify(currentLoad) === JSON.stringify(canonical)) {
                        return prev;
                    }
                    
                    const copy = [...prev.appliedLoads];
                    copy[idx] = { ...(canonical as any) };
                    return { ...prev, appliedLoads: copy };
                });
            });
            unsubscribers.push(unsub);
        });
        
        return () => unsubscribers.forEach(u => u());
    }, [element?.id, element?.appliedLoads, updateElement]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
                setIsDropdownVisible(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [comboboxRef]);


   

    

    
   // Effect to enforce engineering rules (e.g., a single support must be fixed).
    useEffect(() => {
       // If there's only one support, it must be a 'Fixed' support (cantilever).
       if (element?.supports?.length === 1 && element.supports[0].fixity !== SupportFixityType.Fixed) {
           const newSupports = [...element.supports];
           newSupports[0] = { ...newSupports[0], fixity: SupportFixityType.Fixed };
           setElement(prev => ({ ...prev, supports: newSupports }));
       }
    }, [element?.supports]);


    // Recompute all load combinations whenever applied loads or combinations change
    useEffect(() => {
        if (!element) return;
        const newElement = recomputeAllLoadCombinations(element);
        if (JSON.stringify(newElement) !== JSON.stringify(element)) {
            setElement(newElement);
        }
    }, [element?.appliedLoads, element?.loadCombinations, element]);
    
    // Update local element state when parent passes new elementData (e.g., with design results)
    // Only sync specific properties to avoid overriding user changes
    useEffect(() => {
        setElement(prev => {
            // Create a new element with selective updates
            const updated = { ...prev };
            
            // Always sync design results from parent (these come from API responses)
            if (elementData.designResults !== prev.designResults) {
                updated.designResults = elementData.designResults;
                
                // Auto-populate text editor with analysis results when they're received
                if (elementData.designResults && elementData.designResults.length > 0) {
                    const governingResult = elementData.designResults.reduce((max, current) => {
                        const maxUtil = Math.max(
                            max.capacity_data.utilization.bending_strength,
                            max.capacity_data.utilization.shear_strength
                        );
                        const currentUtil = Math.max(
                            current.capacity_data.utilization.bending_strength,
                            current.capacity_data.utilization.shear_strength
                        );
                        return currentUtil > maxUtil ? current : max;
                    });
                    
                    const status = governingResult.capacity_data.status;
                    const bendingUtil = (governingResult.capacity_data.utilization.bending_strength * 100).toFixed(1);
                    const shearUtil = (governingResult.capacity_data.utilization.shear_strength * 100).toFixed(1);
                    
                    const analysisText = `Design analysis completed for ${elementData.name || 'element'}. ` +
                        `Status: ${status}. ` +
                        `Governing combination: ${governingResult.combinationName || 'N/A'}. ` +
                        `Bending utilization: ${bendingUtil}%, Shear utilization: ${shearUtil}%. ` +
                        (status === 'FAIL' ? 'Element requires attention - utilization exceeds limits.' : 
                         status === 'PASS' ? 'Element is adequately designed.' : 'Review required.');
                    
                    // Add to text editor after a brief delay to ensure state is updated
                    setTimeout(() => {
                        appendToTextEditor(analysisText, 'analysis-result');
                    }, 100);
                }
            }
            
            // Always sync saved state and IDs from parent
            if (elementData.id !== prev.id) {
                updated.id = elementData.id;
            }
            if (elementData.projectId !== prev.projectId) {
                updated.projectId = elementData.projectId;
            }
            if (elementData.isSaved !== prev.isSaved) {
                updated.isSaved = elementData.isSaved;
            }
            
            // Only sync other properties if this is the initial load (when prev has default/empty values)
            // or if the parent data is significantly different (like from AI actions)
            const isInitialLoad = !prev.name || prev.name === elementData.name;
            
            // Check for both length changes AND content changes (for AI edits that don't change array length)
            const hasAppliedLoadsChanges = elementData.appliedLoads && JSON.stringify(elementData.appliedLoads) !== JSON.stringify(prev.appliedLoads);
            const hasLoadCombinationsChanges = elementData.loadCombinations && JSON.stringify(elementData.loadCombinations) !== JSON.stringify(prev.loadCombinations);
            const hasSupportsChanges = elementData.supports && JSON.stringify(elementData.supports) !== JSON.stringify(prev.supports);
            const hasStructuralChanges = hasAppliedLoadsChanges || hasLoadCombinationsChanges || hasSupportsChanges;
            
            if (isInitialLoad || hasStructuralChanges) {
                // Sync structural properties from parent (AI changes, etc.)
                if (hasAppliedLoadsChanges) {
                    updated.appliedLoads = elementData.appliedLoads;
                }
                if (hasLoadCombinationsChanges) {
                    updated.loadCombinations = elementData.loadCombinations;
                }
                if (hasSupportsChanges) {
                    updated.supports = elementData.supports;
                }
                
                // Sync basic properties only if significantly different
                if (elementData.name && elementData.name !== prev.name) {
                    updated.name = elementData.name;
                }
                if (elementData.span && Math.abs(elementData.span - prev.span) > 0.001) {
                    updated.span = elementData.span;
                }
                if (elementData.spacing && Math.abs(elementData.spacing - prev.spacing) > 0.001) {
                    updated.spacing = elementData.spacing;
                }
                if (elementData.sectionName && elementData.sectionName !== prev.sectionName) {
                    updated.sectionName = elementData.sectionName;
                    updated.sections = elementData.sections || [];
                }
                
                // Sync document content if it exists and is different
                if (elementData.documentContent && JSON.stringify(elementData.documentContent) !== JSON.stringify(prev.documentContent)) {
                    updated.documentContent = elementData.documentContent;
                }
            }
            
            return updated;
        });
    }, [elementData]);

    // Sync isSaved state when elementData changes
    useEffect(() => {
        if (elementData.isSaved !== isSaved) {
            setIsSaved(elementData.isSaved || false);
        }
    }, [elementData.isSaved]);

    // Sync text editor content when element's document content changes
    useEffect(() => {
        if (element?.documentContent && JSON.stringify(element.documentContent) !== JSON.stringify(textEditorContent)) {
            setTextEditorContent(element.documentContent);
        }
    }, [element?.documentContent]);

    // Auto-resolve section properties when sectionName exists but sections array is empty
    useEffect(() => {
        if (element?.sectionName && (!element?.sections || element.sections.length === 0)) {
            const matchingSection = sections.find(s => 
                s.name.toLowerCase() === element.sectionName.toLowerCase()
            );
            if (matchingSection) {
                console.log(`Auto-resolving section: ${element.sectionName} -> found properties`);
                updateElement(prev => ({
                    ...prev,
                    sections: [matchingSection]
                }));
            }
        }
    }, [element?.sectionName, sections]);

    // Auto-generate descriptions for loads that don't have them
    useEffect(() => {
        if (!element?.appliedLoads) return;
        
        const loadsNeedingDescriptions = element.appliedLoads.some(load => 
            !load.description || load.description.trim() === ''
        );
        
        if (loadsNeedingDescriptions) {
            const generateSmartDescription = (load: any, index: number) => {
                if (load.description && load.description.trim() !== '') {
                    return load.description; // Keep existing description
                }
                
                const elementType = element.type?.toLowerCase() || '';
                const loadCases = load.forces?.map((f: any) => f.loadCase).join(' + ') || 'Load';
                const typeStr = load.type === 'PointLoad' ? 'Point Load' : 
                              load.type === 'UDL' ? 'UDL' : 'Load';
                
                if (elementType.includes('floor') || elementType.includes('joist')) {
                    return `Floor ${loadCases} ${typeStr}`;
                } else if (elementType.includes('roof') || elementType.includes('rafter')) {
                    return `Roof ${loadCases} ${typeStr}`;
                } else if (elementType.includes('beam')) {
                    return `Beam ${loadCases} ${typeStr}`;
                } else {
                    return `${loadCases} ${typeStr}`;
                }
            };

            updateElement(prev => ({
                ...prev,
                appliedLoads: prev.appliedLoads.map((load, index) => ({
                    ...load,
                    description: generateSmartDescription(load, index)
                }))
            }));
        }
    }, [element?.appliedLoads, element?.type]);
    //#endregion







    //#region Form Handlers
    /**
    *  Handles changes to the main element properties.
    */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement >) => {
        const { name, value } = e.target;
        const isNumeric = ['span', 'spacing', 'section_count'].includes(name);
        const newValue = isNumeric ? Number(value) : value;

        updateElement(prev => {
            let newElement = { ...prev, [name]: newValue };
            
            // When span changes, update support positions and load positions
            if (name === 'span') {
                const oldSpan = prev.span;
                const newSpan = Number(value);
                
                // Update lateralRestraintSpacing to match new span
                newElement.designParameters = {
                    ...(prev.designParameters as DesignParameters),
                    lateralRestraintSpacing: newSpan,
                } as DesignParameters;
                
                // Update the position of the last support if it's a roller
                const lastIdx = newElement.supports.length - 1;
                if (lastIdx >= 0 && newElement.supports[lastIdx].fixity === SupportFixityType.Roller) {
                    const newSupports = [...newElement.supports];
                    newSupports[lastIdx] = { ...newSupports[lastIdx], position: newSpan };
                    newElement.supports = newSupports;
                }
                
                // Update load positions based on span change
                newElement.appliedLoads = newElement.appliedLoads.map(load => {
                    const newLoad = { ...load };
                    
                    if (load.type === LoadType.UDL || load.type === LoadType.TrapezoidalLoad) {
                        // For UDL and trapezoidal loads, update the end position to match new span
                        if (newLoad.position.length > 1) {
                            const newPositions = [...newLoad.position];
                            newPositions[newPositions.length - 1] = String(newSpan);
                            newLoad.position = newPositions;
                        }
                    } else if (load.type === LoadType.PointLoad) {
                        // For point loads, scale position proportionally based on span ratio
                        if (oldSpan > 0 && newLoad.position.length > 0) {
                            const currentPosition = Number(newLoad.position[0]);
                            const proportionalPosition = (currentPosition / oldSpan) * newSpan;
                            newLoad.position = [String(proportionalPosition)];
                        }
                    }
                    
                    return newLoad;
                });
            }
            
            return newElement;
        });
    };
    
    const handleSectionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const searchText = e.target.value;
        setSectionSearchText(searchText);
        setElement(prev => ({ ...prev, sectionName: searchText, sections: [] })); // Clear full section data while typing

        if (searchText) {
            const filtered = sections
                .filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()))
                .slice(0, 4);
            setFilteredSections(filtered);
        } else {
            setFilteredSections(sections.slice(0, 4));
        }
        setIsDropdownVisible(true);
    };

    const handleSelectSection = (section: SectionProperties) => {
        setSectionSearchText(section.name);
        updateElement(prev => ({
            ...prev,
            sectionName: section.name,
            sections: [section]
        }));
        setIsDropdownVisible(false);
    };

    const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedSectionName = e.target.value;
        const selectedSection = sections.find(s => s.name === selectedSectionName);
        if (selectedSection) {
            updateElement(prev => ({
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
    const handleSubmit = async () => {
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
            // Include text editor content in the element before saving
            const elementWithDocument = {
                ...element,
                documentContent: textEditorContent,
                documentPlainText: getDocumentPlainText()
            };
            
            // Perform save via parent
            await onSave(elementWithDocument);
            
            // Re-fetch from backend to include any reaction data
            if (element.projectId && element.id) {
                try {
                    const fresh = await projectService.getElement(element.projectId, element.id);
                    setElement(fresh);
                    
                    // If the fresh element has document content, update the text editor
                    if (fresh.documentContent) {
                        setTextEditorContent(fresh.documentContent);
                    }
                } catch (fetchErr) {
                    console.warn('Failed to reload element after save:', fetchErr);
                }
            }
            // Mark as saved
            setIsSaved(true);
            setHasUnsavedDocumentChanges(false);
        } catch (error) {
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
        updateElement(prev => ({ ...prev, supports: newSupports }));
    };

    const addSupport = () => updateElement(prev => ({...prev, supports: [...prev.supports, { position: prev.span, fixity: SupportFixityType.Roller }]}));
    
    const removeSupport = (index: number) => updateElement(prev => ({...prev, supports: prev.supports.filter((_, i) => i !== index)}));
   
    //#endregion








    //#region Project Handlers
    /**
     * Handles changing the element's project assignment.
     * Clears any data that might be project-specific to prevent errors.
     */
    const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedProjectId = e.target.value;
        
        // Clear project-specific state immediately to prevent conflicts
        setReactionSourceElementId('');
        setFetchedCandidateElements([]);
        
        // Use updateElement which will notify parent via onChange about project changes
        updateElement(prev => ({
            ...prev,
            projectId: selectedProjectId,
            // Clear potential project-specific data that might cause conflicts
            loadTransfers: [], // Clear load transfers as they depend on elements in the project
        }));
    };
    //#endregion






    //#region Load Handlers
     /**
     * Handles changes to individual applied load properties.
     * @param loadIndex - The index of the load being changed.
     * @param newType - The new type of the load.
     */
    const handleLoadTypeChange = (loadIndex: number, newType: LoadType) => {
        updateElement(prev => {
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
            const updated = { ...prev, appliedLoads: newAppliedLoads };
            const updatedElement = recomputeAllLoadCombinations(updated);
            return updatedElement;
        });
    };
    /**
     * Handles changes to a load's description.
     * @param loadIndex - index of the applied load to update
     * @param newDescription - new description text
     */
    const handleLoadDescriptionChange = (loadIndex: number, newDescription: string) => {
        updateElement(prev => {
            const newLoads = [...prev.appliedLoads];
            const current = newLoads[loadIndex] as any;
            // Update local state
            newLoads[loadIndex] = { ...current, description: newDescription };
            // If this load is synced via transfer, update in registry
            if (current.transfer?.projectId && current.transfer.transferGroupId) {
                projectTransferRegistry.update(
                    current.transfer.projectId,
                    current.transfer.transferGroupId,
                    { description: newDescription }
                );
            }
            return { ...prev, appliedLoads: newLoads };
        });
    };

    const handleAppliedLoadChange = (loadIndex: number, forceIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateElement(prev => {
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
        updateElement(prev => {
            const newLoads = [...prev.appliedLoads];
            const newForces = [...newLoads[loadIndex].forces];
            const newMagnitudes = [...newForces[forceIndex].magnitude];
            const magInN = Number(value) * 1000; // Convert kN input to N
            newMagnitudes[magnitudeIndex] = magInN;
            newForces[forceIndex] = { ...newForces[forceIndex], magnitude: newMagnitudes };
            newLoads[loadIndex] = { ...newLoads[loadIndex], forces: newForces };

            // If this load is synced via transfer, update canonical registry immediately
            const load = newLoads[loadIndex] as any;
            if (load.transfer?.transferGroupId && load.transfer?.projectId) {
                try {
                    projectTransferRegistry.update(load.transfer.projectId, load.transfer.transferGroupId, load);
                } catch (err) {
                    console.warn('Failed to update transfer registry', err);
                }
            }

            return { ...prev, appliedLoads: newLoads };
        });
      };
    
      // Handles changes to the position of a load.
    const handleLoadPositionChange = (loadIndex: number, posIndex: number, value: string) => {
        updateElement(prev => {
            const newLoads = [...prev.appliedLoads];
            const newPositions = [...newLoads[loadIndex].position];
            newPositions[posIndex] = value;
            newLoads[loadIndex] = { ...newLoads[loadIndex], position: newPositions };
            return { ...prev, appliedLoads: newLoads };
        });
    };
    
    const addAppliedLoad = () => {
        // Generate smart load description based on element type and context
        const generateLoadDescription = () => {
            const elementType = element.type?.toLowerCase() || '';
            const loadCount = element.appliedLoads.length + 1;
            
            if (elementType.includes('floor') || elementType.includes('joist')) {
                return 'Floor Dead + Live Load';
            } else if (elementType.includes('roof') || elementType.includes('rafter')) {
                return 'Roof Dead + Live Load';
            } else if (elementType.includes('beam')) {
                return 'Beam Load Combination';
            } else {
                return `Applied Load ${loadCount}`;
            }
        };

        updateElement(prev => ({
            ...prev,
            appliedLoads: [
                ...prev.appliedLoads,
                {
                    type: LoadType.UDL,
                    position: ['0', String(prev.span)],
                    description: generateLoadDescription(),
                    forces: [
                        { magnitude: [0], loadCase: LoadCaseType.Dead },
                        { magnitude: [0], loadCase: LoadCaseType.Live }
                    ]
                }
            ]
        }));
    };

    const removeAppliedLoad = (index: number) => {
        updateElement(prev => ({
            ...prev,
            appliedLoads: prev.appliedLoads.filter((_, i) => i !== index)
        }));
    };
    
    const addForceToLoad = (loadIndex: number) => {
        updateElement(prev => {
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
        updateElement(prev => {
            const newLoads = [...prev.appliedLoads];
            newLoads[loadIndex].forces = newLoads[loadIndex].forces.filter((_, i) => i !== forceIndex);
            return { ...prev, appliedLoads: newLoads };
        });
    };
    //#endregion







    //#region Load Combination Handlers
    const handleCombinationChange = (comboIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateElement(prev => {
            const newCombinations = [...prev.loadCombinations];
            newCombinations[comboIndex] = { ...newCombinations[comboIndex], [name]: value };
            return { ...prev, loadCombinations: newCombinations };
        });
    };

    const addCombination = () => {
        updateElement(prev => ({
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
        updateElement(prev => ({
            ...prev,
            loadCombinations: prev.loadCombinations.filter((_, i) => i !== index)
        }));
    };

    const handleFactorChange = (comboIndex: number, factorIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['factor', 'termFactor'].includes(name);
        updateElement(prev => {
            const newCombinations = [...prev.loadCombinations];
            const newFactors = [...newCombinations[comboIndex].loadCaseFactors];
            newFactors[factorIndex] = { ...newFactors[factorIndex], [name]: isNumeric ? Number(value) : value };
            newCombinations[comboIndex] = { ...newCombinations[comboIndex], loadCaseFactors: newFactors };
            return { ...prev, loadCombinations: newCombinations };
        });
    };

    const addFactor = (comboIndex: number) => {
        updateElement(prev => {
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
        updateElement(prev => {
            const newCombinations = [...prev.loadCombinations];
            const combo = newCombinations[comboIndex];
            combo.loadCaseFactors = combo.loadCaseFactors.filter((_, i) => i !== factorIndex);
            return { ...prev, loadCombinations: newCombinations };
        });
    };

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
        const updatedCombinations = currentElement.loadCombinations.map(combo => ({
            ...combo, 
            computedResult: (() => {
                if (!combo.loadCaseFactors || combo.loadCaseFactors.length === 0) {
                    return undefined;
                }
                try {
                    return utils.computeLoadCombination(currentElement.appliedLoads, combo);
                } catch (error) {
                    console.warn('Error computing load combination:', error);
                    return undefined;
                }
            })()
        }));
        return { ...currentElement, loadCombinations: updatedCombinations };
    };
    //#endregion







    //#region Validation & Helper function 

    /** Helper function to append AI-generated content to the text editor
    * @param content The text content to append
    * @param type The type of content (e.g., 'ai-insight', 'analysis-result')
    */
    const appendToTextEditor = (content: string, type: 'ai-insight' | 'analysis-result' | 'general' = 'general') => {
        const timestamp = new Date().toLocaleString();
        const newBlock = {
            type: 'paragraph',
            children: [
                { text: `[${timestamp}] `, bold: true },
                { text: `${type.toUpperCase()}: `, bold: true, italic: true },
                { text: content }
            ]
        };
        
        setTextEditorContent(prev => [...prev, newBlock]);
    };

    // Expose appendToTextEditor to parent component
    useEffect(() => {
        if (onAddTextEditorContent) {
            // This is a bit of a hack to expose the function to parent - 
            // in a real implementation you might want to use useImperativeHandle or a ref
            (onAddTextEditorContent as any).current = appendToTextEditor;
        }
    }, [onAddTextEditorContent]);

    // Register download callback with parent component
    useEffect(() => {
        if (onRegisterDownload && textEditorRef.current) {
            const downloadCallback = () => {
                textEditorRef.current?.downloadPdf?.();
            };
            onRegisterDownload(downloadCallback);
        }
    }, [onRegisterDownload, textEditorRef.current]);

    /** Helper function to extract plain text from the text editor content
    * @returns Plain text string representation of the document
    */
    const getDocumentPlainText = (): string => {
        return textEditorContent.map(block => 
            block.children.map((child: any) => child.text).join('')
        ).join('\n');
    };

    /** Handle text editor content changes */
    const handleTextEditorChange = (newContent: any[]) => {
        setTextEditorContent(newContent);
        setHasUnsavedDocumentChanges(true);
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

    // Helper: Validation for support/load positions
    const isSupportPositionInvalid = (pos: number) => element?.span ? pos > element.span : false;
    const isLoadPositionInvalid = (pos: string) => element?.span ? Number(pos) > element.span : false;
    const hasDuplicateSupportPositions = () => {
        if (!element?.supports) return false;
        const positions = element.supports.map(s => s.position);
        return new Set(positions).size !== positions.length;
    };
    const anySupportInvalid = element?.supports ? (element.supports.some(s => isSupportPositionInvalid(s.position)) || hasDuplicateSupportPositions()) : false;
    const anyLoadInvalid = element?.appliedLoads ? element.appliedLoads.some(l => l.position.some(isLoadPositionInvalid)) : false;
    const formHasError = anySupportInvalid || anyLoadInvalid;

    // Helper function to check if any design results have failed
    const hasFailedDesignResults = (): boolean => {
        return element?.designResults?.some(result => result.capacity_data.status === 'FAIL') || false;
    };

    // Find the governing design result to display in the main summary
    const governingResult = element?.designResults && element.designResults.length > 0
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
        { label: 'Count', value: visibleLoadCombinations || [], arrayDisplayType: 'count' as const },
        { label: 'Types', value: visibleLoadCombinations || [], arrayDisplayType: 'list' as const, arrayProperty: 'combinationType', maxArrayItems: 5 },
        { label: 'Names', value: visibleLoadCombinations?.filter(c => c.name && c.name.trim() !== '') || [], arrayDisplayType: 'list' as const, arrayProperty: 'name', maxArrayItems: 5 }
    ];

    if (governingResult) {
        loadCombinationsSummaryItems.push({
            label: 'Governing',
            value: [`${governingResult.combinationName || 'N/A'} (B: ${(governingResult.capacity_data.utilization.bending_strength * 100).toFixed(0)}%, S: ${(governingResult.capacity_data.utilization.shear_strength * 100).toFixed(0)}%)`]
        });
    }


    // Early return if element is null during project transfer
    if (!element) {
        return (
            <div className="p-3 text-sm italic text-gray-500 text-center border rounded-lg bg-gray-50">
                <p>Loading element...</p>
            </div>
        );
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
    //#endregion








    //#region Render Main Form
    return (
        <div className={`space-y-4 border p-4 rounded-xl shadow-sm bg-base-100 relative`}>
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
                    <div className="relative" ref={comboboxRef}>
                        <label className={labelClasses}>Section Name</label>
                        <input
                            type="text"
                            name="sectionName"
                            value={sectionSearchText}
                            onChange={handleSectionInputChange}
                            onFocus={() => {
                                setFilteredSections(sections.slice(0, 4));
                                setIsDropdownVisible(true);
                            }}
                            className={inputClasses}
                            placeholder="Type to search sections..."
                            autoComplete="off"
                        />
                        {isDropdownVisible && (
                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                                {filteredSections.length > 0 ? (
                                    filteredSections.map(s => (
                                        <li
                                            key={s.id}
                                            className="px-4 py-2 cursor-pointer hover:bg-teal-100"
                                            onMouseDown={() => handleSelectSection(s)} // Use onMouseDown to fire before onBlur
                                        >
                                            {s.name}
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-4 py-2 text-gray-500">No sections found</li>
                                )}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label className={labelClasses}>Project</label>
                        <select name="projectId" value={element.projectId || ''} onChange={handleProjectChange} className={inputClasses}>
                            <option value="" disabled>Select Project</option>
                            {projectData && projectData.length > 0 ? (
                                projectData.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.id === element.projectId ? '(Current)' : ''}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No projects available</option>
                            )}
                        </select>
                    </div>
                    <div><label className={labelClasses}>Spacing/Tributary (m)</label><input name="spacing" type="number" step="any" value={element.spacing} onChange={handleChange} className={inputClasses} /></div>

                </div>
            </FormCollapsibleSectionWithStagedSummary>

            {/* Element Data - Wraps all detailed form sections */}
            <FormCollapsibleSectionWithStagedSummary 
                title="Element Input Data" 
                defaultStage="preview"
                color="bg-slate-50/50"
                summaryItems={[
                    { 
                        label: 'Design Params', 
                        value: `${element.designParameters?.materialType || 'Timber'} | ${element.designParameters?.countryOfStandard || 'NZ'} | ${element.designParameters?.lateralRestraintSpacing || '1'}m` 
                    },
                    { 
                        label: 'Sections', 
                        value: element.sections || [], 
                        arrayDisplayType: 'count' 
                    },
                    { 
                        label: 'Supports', 
                        value: element.supports.length + ' supports | ' + element.supports.map(s => s.fixity).join(', ').substring(0, 20) + (element.supports.map(s => s.fixity).join(', ').length > 20 ? '...' : '')
                    },
                    { 
                        label: 'Loads', 
                        value: element.appliedLoads.length + ' loads | ' + element.appliedLoads.map(l => l.type).join(', ').substring(0, 15) + (element.appliedLoads.map(l => l.type).join(', ').length > 15 ? '...' : '')
                    },
                    { 
                        label: 'Combinations', 
                        value: visibleLoadCombinations.length + ' combos | ' + visibleLoadCombinations.map(c => c.combinationType).join(', ').substring(0, 15) + (visibleLoadCombinations.map(c => c.combinationType).join(', ').length > 15 ? '...' : '')
                    }
                ]}
            >

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
                {label: "", value: element.supports.length+" No"},
                {label: "Types", value: element.supports, arrayDisplayType: 'list', arrayProperty: 'fixity', maxArrayItems: 3},
                {label: 'Positions', value: element.supports, arrayDisplayType: 'list', arrayProperty: 'position', maxArrayItems: 3, unit: 'm' }

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
            <FormCollapsibleSectionWithStagedSummary title="Applied Loads" color="bg-teal-50/50" enableDoubleClickExpand={true} defaultStage="preview"
                summaryItems={[
                    { label: '', value: element.appliedLoads.length+" No", arrayDisplayType: 'count' },
                    { label: 'Types', value: element.appliedLoads, arrayDisplayType: 'list', arrayProperty: 'type', maxArrayItems: 3 },
                    { label: 'Load Cases', value: element.appliedLoads.flatMap(load => load.forces.map(f => f.loadCase)), arrayDisplayType: 'list', maxArrayItems: 3 },
                    { label: 'Magnitudes', value: element.appliedLoads.flatMap(load => load.forces.map(f => formatMagnitudeWithUnit(f.magnitude, load.type))), arrayDisplayType: 'list', maxArrayItems: 3 }
                ]}>
                 <div className="space-y-3">
                    {element.appliedLoads.map((load, loadIndex) => (
                        <FormCollapsibleSectionWithStagedSummary
                            key={loadIndex}
                            title={load.description || `Applied Load ${loadIndex + 1}`}
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
                                        <label className={labelClasses}>Name</label>
                                        <input type="text" value={load.description} onChange={(e) => handleLoadDescriptionChange(loadIndex, e.target.value)} className={`${inputClasses}`} placeholder="Load Name"/>

                                     </div>
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
                                {visibleLoadCombinations && visibleLoadCombinations.length > 0 && (
                                    <div className="mt-3 p-2 bg-yellow-50/30 rounded border">
                                        <label className="text-sm font-semibold text-gray-800 mb-2 block">Combination Results for this Load</label>
                                        <div className="space-y-1">
                                            {visibleLoadCombinations.map((combo, combIdx) => {
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
                    <div className="w-full mt-2">
                        <div className="flex flex-col md:flex-row items-stretch gap-2">
                            <select value={newLoadSourceMode} onChange={e => setNewLoadSourceMode(e.target.value as any)} className={inputClasses}>
                                <option value="manual">Manual</option>
                                <option value="fromProjectReaction">From Element's (Fy) Reaction</option>
                            </select>

                            {newLoadSourceMode === 'fromProjectReaction' ? (
                                <div className="flex gap-2 w-full">
                                    <select value={reactionSourceElementId} onChange={e => setReactionSourceElementId(e.target.value)} className={inputClasses}>
                                        <option value="">Select source element</option>
                                        {candidateElements.map(pe => (
                                            <option key={pe.id} value={pe.id}>{pe.name || pe.id}</option>
                                        ))}
                                    </select>

                                    <select value={reactionSourceSupportIndex as any} onChange={e => setReactionSourceSupportIndex(e.target.value === '' ? '' : Number(e.target.value))} className={inputClasses}>
                                        <option value="">Support #</option>
                                        {selectedSourceSupports.map((s: any, idx: number) => (
                                            <option key={idx} value={idx}>Support {idx + 1} @ {String(s.position)}</option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                if (!reactionSourceElementId || reactionSourceSupportIndex === '') return;
                                                const src = candidateElements.find(p => p.id === reactionSourceElementId);
                                                if (!src) return;
                                                const canonical = projectTransferRegistry.createPointLoadFromReaction(
                                                    src,
                                                    reactionSourceSupportIndex as number,
                                                    element,
                                                    (pos) => Number(pos)
                                                );
                                                // Deduplicate prior to adding
                                                setElement(prev => {
                                                    const filtered = prev.appliedLoads.filter(
                                                        load => (load as any).transfer?.transferGroupId !== canonical.transfer?.transferGroupId
                                                    );
                                                    return { ...prev, appliedLoads: [...filtered, canonical as any] };
                                                });
                                            } catch (err) {
                                                console.error('Transfer failed', err);
                                            }
                                        }}
                                        className="btn-add"
                                    >
                                        Transfer
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={addAppliedLoad} className="w-full flex items-center justify-center gap-2 text-sm font-semibold p-2 border-2 border-dashed border-gray-300 rounded-lg text-teal-700 hover:border-teal-500 hover:bg-teal-50"><AddIcon className="w-5 h-5"/> Add Applied Load</button>
                            )}
                        </div>
                    </div>
                 </div>
            </FormCollapsibleSectionWithStagedSummary>

            {/* Load Combinations Section */}
            <FormCollapsibleSectionWithStagedSummary
                title="Load Combinations"
                defaultStage="preview"
                enableDoubleClickExpand={true}  
                color="bg-violet-50/50"
                summaryItems={loadCombinationsSummaryItems}
            >
                <div className="space-y-2">
                    {visibleLoadCombinations && visibleLoadCombinations.length > 0 ? (
                        visibleLoadCombinations.map((combo, idx) => (
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
                                            disabled={visibleLoadCombinations.length === 0}
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
                        onClick={() => {
                            setElement(prev => ({ ...prev, loadCombinations: [...prev.loadCombinations, { name: '', combinationType: 'Ultimate', loadCaseFactors: [] }] }));
                        }}
                        className="w-full flex items-center justify-center gap-2 text-sm font-semibold p-2 border-2 border-dashed border-gray-300 rounded-lg text-violet-700 hover:border-violet-500 hover:bg-violet-50"
                    >
                        <AddIcon className="w-5 h-5"/> Add Load Combination
                    </button>
                </div>
            </FormCollapsibleSectionWithStagedSummary>

            </FormCollapsibleSectionWithStagedSummary>

            {/* Design Results Display */}
            {element.designResults && element.designResults.length > 0 && (
                <DesignResultsDisplay 
                    results={element.designResults} 
                    isVisible={true} 
                />
            )}

            {/* Document View */}
            <FormCollapsibleSectionWithStagedSummary 
                title="Document View" 
                color="bg-amber-50/50" 
                defaultStage="preview"
                summaryItems={[
                    { 
                        label: 'Content', 
                        value: textEditorContent.map(block => 
                            block.children.map((child: any) => child.text).join('')
                        ).join(' ').substring(0, 100) + (
                            textEditorContent.map(block => 
                                block.children.map((child: any) => child.text).join('')
                            ).join(' ').length > 100 ? '...' : ''
                        )
                    },
                    { 
                        label: 'Word Count', 
                        value: textEditorContent.map(block => 
                            block.children.map((child: any) => child.text).join('')
                        ).join(' ').split(' ').filter(word => word.length > 0).length 
                    }
                ]}
            >
                <TextEditor
                    ref={textEditorRef}
                    content={textEditorContent}
                    onChange={handleTextEditorChange}
                    title={`${element.name || 'Element'} Document${hasUnsavedDocumentChanges ? ' *' : ''}`}
                    placeholder="Element analysis and design output"
                    className="p-4"
                />
            </FormCollapsibleSectionWithStagedSummary>

            {/* Pin to canvas is handled by the chat overlay; parent will call onPin when requested. */}

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
                <button 
                    type="button" 
                    onClick={handleSave} 
                    disabled={statusMessage?.type === 'loading'} 
                    className={`flex items-center gap-2 px-5 py-2.5 font-semibold rounded-lg transition-colors disabled:bg-gray-400 ${
                        hasUnsavedDocumentChanges || !isSaved
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' // Unsaved changes
                        : 'bg-blue-600 hover:bg-blue-700 text-white' // No changes
                    }`}
                >
                    <SaveIcon className="w-5 h-5"/> 
                    {hasUnsavedDocumentChanges ? 'Save Document' : (isSaved ? 'Update' : 'Save')}
                </button>
                <button 
                    type="button" 
                    onClick={handleSubmit} 
                    className={`px-5 py-2.5 font-semibold rounded-lg transition-colors ${
                        !element.designResults || element.designResults.length === 0
                        ? 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100' // Default state
                        : hasFailedDesignResults()
                        ? 'bg-pink-500 hover:bg-pink-600 text-white' // Fail state
                        : 'bg-green-500 hover:bg-green-600 text-white' // Success state
                    }`}
                >
                    Design Element
                </button>
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
    //#endregion  
};

export default StructuralElementForm;