// Centralized element type options for dropdowns

import { MaterialType, SectionProperties } from "./SectionProperties";

export enum ELEMENT_TYPE_OPTIONS {
  Beam = "Beam",
  RoofBeam = "Roof Beam",
  FloorBeam = "Floor Beam",
  Rafter = "Rafter",
  Purlin = "Purlin",
  Joist = "Joist",
  Bearer = "Bearer",
  Lintel = "Lintel",
  WindBeam = "Wind Beam",
  WindPost = "Wind Post"
}
// Represents the type of fixity for a support.

export enum SupportFixityType {
  Pinned = 'Pinned',
  Roller = 'Roller',
  Fixed = 'Fixed',
  Free = 'Free'
}
// Represents the type of load applied to a beam.

export enum LoadType {
  UDL = 'UDL',
  PointLoad = 'Point Load',
  TrapezoidalLoad = 'Trapezoidal Load'
}
// Represents the type of load case for structural analysis

export enum LoadCaseType {
  Dead = 'Dead',
  Live = 'Live',
  Snow = 'Snow',
  Wind = 'Wind',
  Seismic = 'Seismic',
  Rain = 'Rain',
  Construction = 'Construction',
  Temperature = 'Temperature',
  Settlement = 'Settlement',
  Other = 'Other'
}
// Represents the building code standard for load combinations

export enum BuildingCodeType {
  ASCE7_22 = 'ASCE 7-22',
  ASCE7_16 = 'ASCE 7-16', 
  IBC_2021 = 'IBC 2021',
  IBC_2018 = 'IBC 2018',
  EUROCODE_1 = 'Eurocode 1',
  NBC_2020 = 'NBC 2020',
  AS_NZS_1170 = 'AS/NZS 1170',
  CSA_O86 = 'CSA O86',
  CUSTOM = 'Custom',
  NONE = 'None'
}
 
// Represents the design method for load combinations

export enum DesignMethodType {
  LRFD = 'LRFD',
  ASD = 'ASD', 
  ULD = 'ULD',
  WSD = 'WSD',
  NONE = 'None'
}

// Defines the structure for a support point on a beam.

export interface Support {
  position: number;
  fixity: SupportFixityType;
  reaction?: {
    Fx?: AppliedLoads;
    Fy?: AppliedLoads;
    Mz?: AppliedLoads;
  };

}
// Enhanced support interface for advanced structural analysis

export interface EnhancedSupport {
  position: number;
  fixity: number[]; // [x_restraint, y_restraint, moment_restraint] where 1=restrained, 0=free
  kx?: number | null; // Spring stiffness in x-direction
  ky?: number | null; // Spring stiffness in y-direction
  kr?: number | null; // Rotational spring stiffness
}
// Defines the structure for a load applied to a beam.

export interface Load {
  type: LoadType;
  name: string; // e.g., "Floor Live Load", "Roof Dead Load"
  magnitude: number[];
  position: string[];
}

// Interface for applied loads where type and position are consistent but magnitudes vary
export interface AppliedLoads {
  type: LoadType; // Common load type for all loads in this group
  position: string[]; // Common position for all loads in this group
  forces: { magnitude: number[]; loadCase: LoadCaseType }[]; // Array of objects representing magnitude and associated load case
  description?: string; // Optional description of the applied loads group
}

export interface CombinationLoads {
  type: LoadType; // Common load type for all loads in this group
  position: string[]; // Common position for all loads in this group
  magnitude: number[];
  description?: string; // Optional description of the applied loads group
  loadCombination?: string; // Optional load combination identifier
}
// Enhanced load interface for advanced structural analysis


// Defines a load case with its type and associated loads

export interface LoadCase {
  name: string;
  type: LoadCaseType; // Type of load case (G=Dead, Q=Live, W=Wind, etc.)
  combinationFactor: number; // Multiplication factor for this load case
  description?: string;
  loads: Load[]; // Array of loads for this load case
  isActive: boolean;
}
// Defines a load case factor for use in load combinations

export interface LoadCaseFactor {
  loadCaseId?: string; // Reference to the load case
  loadCaseType: LoadCaseType;
  termFactor: number; // Multiplication long term and short term factor for this load case
  description?: string;
  factor: number; // Multiplication Load factor for this load case
  isActive?: boolean; // Whether this load case is active in the combination
}
// Computed load result for a specific load after applying combination factors

 

// Load combination result for the entire structure
export interface LoadCombination {
  id?: string; // Optional - can be generated when needed
  name: string; // e.g., "1.2G + 1.5Q", "1.2G + 1.5Q + 0.9W"
  description?: string;
  loadCaseFactors: LoadCaseFactor[]; // Array of load case factors (like the table in your image)
  isGoverning?: boolean; // Indicates if this is the critical combination
  isActive?: boolean; // Whether this combination is active
  codeReference?: string; // e.g., "ASCE 7-22 Eq. 2.3-1", "AS/NZS 1170 Eq. 4.2.1"
  combinationType?: 'Ultimate' | 'Serviceability' | 'Other' | 'Reaction';
  // Computed results for this combination (array of loads, one for each applied load)
  computedResult?: Load[]; // Array of loads, one for each applied load
}
// Utility function interface for computing load combinations

export interface LoadCombinationCalculator {
  /**
   * Computes the load combination result by applying factors to applied loads
   * @param appliedLoads - Array of applied loads with different magnitudes for each load case
   * @param combination - The load combination to compute
   * @returns Array of computed combination loads, one for each applied load
   */
  computeLoadCombination(appliedLoads: AppliedLoads[], combination: LoadCombination): Load[];

  /**
   * Computes a specific applied load with combination factors
   * @param appliedLoad - The applied load with multiple magnitudes
   * @param combination - The load combination with factors
   * @returns The computed combination load
   */
  computeAppliedLoad(appliedLoad: AppliedLoads, combination: LoadCombination): CombinationLoads;
}
// Common load case abbreviations for structural engineering




export class LoadCombinationUtils implements LoadCombinationCalculator {

  computeLoadCombination(appliedLoads: AppliedLoads[], combination: LoadCombination): Load[] {
    const combinationLoads: Load[] = [];

    // Process each applied load
    appliedLoads.forEach(appliedLoad => {
      const combinationLoad = this.computeAppliedLoad(appliedLoad, combination);
      combinationLoads.push(combinationLoad);
    });

    return combinationLoads;
  }

  computeAppliedLoad(appliedLoad: AppliedLoads, combination: LoadCombination): Load {
    let totalMagnitude: number[] = [];
    let type = appliedLoad.type;
    let name = "Combined Load"; // Default name for combined load

    // Apply combination factors to each load case magnitude
    appliedLoad.forces.forEach(force => {
      // Find the corresponding load case factor in the combination (treat undefined isActive as true)
      const factor = combination.loadCaseFactors.find(
        lcf => lcf.loadCaseType === force.loadCase && (lcf.isActive !== false)
      );
      
      if (factor) {
        // Apply both the load factor and term factor
        const combinedFactor = factor.factor * factor.termFactor;
        
        if (totalMagnitude.length === 0) {
          totalMagnitude = force.magnitude.map(mag => mag * combinedFactor);
        } else {
          // Add to existing magnitude
          totalMagnitude[0] = (totalMagnitude[0] || 0) + (force.magnitude[0] || 0) * combinedFactor;
          if (type === LoadType.TrapezoidalLoad && force.magnitude.length > 1) {
            if (totalMagnitude.length < 2) totalMagnitude.push(0);
            totalMagnitude[1] = (totalMagnitude[1] || 0) + (force.magnitude[1] || 0) * combinedFactor;
          }
        }
      }
    });

    return {
      type: appliedLoad.type,
      name: combination.name,
      position: [...appliedLoad.position],
      magnitude: totalMagnitude
    };
  }

  /**
   * Generate a unique ID for a load combination
   * @param name - The combination name (e.g., "1.2G + 1.5Q")
   * @param type - The combination type
   * @returns A unique string ID
   */
  private generateCombinationId(name: string, type?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    const typePrefix = type ? `${type.toLowerCase()}_` : '';
    return `${typePrefix}${sanitizedName}_${timestamp}_${random}`;
  }

  /**
   * Ensures individual load combinations exist for reaction analysis.
   * Analyzes existing combinations and creates individual load case combinations as needed.
   * 
   * @param element - The structural element to process
   * @param options - Configuration options
   * @returns Updated element with individual load combinations added
   */
  reactionLoadCombinations(
    element: Element, 
    options: {
      forceRegenerate?: boolean;
      includeInactive?: boolean;
      customFactors?: { [loadCase: string]: { factor: number; termFactor: number } };
    } = {}
  ): Element {
    const { forceRegenerate = false, includeInactive = false, customFactors = {} } = options;
    
    // Create a copy of the element to avoid mutation
    const updatedElement: Element = { ...element };
    
    // Ensure loadCombinations array exists
    if (!updatedElement.loadCombinations) {
      updatedElement.loadCombinations = [];
    }
    
    // Get all unique load case types from appliedLoads
    const allLoadCaseTypes = new Set<LoadCaseType>();
    
    if (updatedElement.appliedLoads) {
      updatedElement.appliedLoads.forEach(appliedLoad => {
        appliedLoad.forces.forEach(force => {
          allLoadCaseTypes.add(force.loadCase);
        });
      });
    }
    
    // Also check existing combinations for additional load case types
    updatedElement.loadCombinations.forEach(combination => {
      if (includeInactive || combination.isActive !== false) {
        combination.loadCaseFactors.forEach(factor => {
          allLoadCaseTypes.add(factor.loadCaseType);
        });
      }
    });
    
    // Track existing individual combinations to avoid duplicates
    const existingIndividualCombinations = new Set<string>();
    
    if (!forceRegenerate) {
      updatedElement.loadCombinations.forEach(combination => {
        if (combination.combinationType === 'Reaction' && 
            combination.loadCaseFactors.length === 1) {
          const loadCaseType = combination.loadCaseFactors[0].loadCaseType;
          existingIndividualCombinations.add(loadCaseType);
        }
      });
    }
    
    // Create individual combinations for each load case type
    const newIndividualCombinations: LoadCombination[] = [];
    
    allLoadCaseTypes.forEach(loadCaseType => {
      if (forceRegenerate || !existingIndividualCombinations.has(loadCaseType)) {
        // Get custom factors or use defaults
        const customFactor = customFactors[loadCaseType];
        const factor = customFactor?.factor ?? 1.0;
        const termFactor = customFactor?.termFactor ?? 1.0;
        
        const individualCombination: LoadCombination = {
          id: this.generateCombinationId(loadCaseType, 'reaction'),
          name: loadCaseType,
          description: `Individual ${loadCaseType} load case for reaction analysis`,
          combinationType: 'Reaction',
          isActive: true,
          loadCaseFactors: [{
            loadCaseType: loadCaseType,
            factor: factor,
            termFactor: termFactor,
            description: `${loadCaseType} load case factor`,
            isActive: true
          }]
        };
        
        newIndividualCombinations.push(individualCombination);
      }
    });
    
    // If regenerating, remove existing individual combinations first
    if (forceRegenerate) {
      updatedElement.loadCombinations = updatedElement.loadCombinations.filter(
        combination => !(combination.combinationType === 'Reaction' && 
                        combination.loadCaseFactors.length === 1)
      );
    }
    
    // Add new individual combinations
    updatedElement.loadCombinations.push(...newIndividualCombinations);
    
    // Ensure all existing combinations have IDs
    updatedElement.loadCombinations.forEach(combination => {
      if (!combination.id) {
        combination.id = this.generateCombinationId(
          combination.name, 
          combination.combinationType?.toLowerCase()
        );
      }
    });
    
    // Populate reactions array with individual combinations
    if (!updatedElement.reactions) {
      updatedElement.reactions = [];
    }
    
    // Add individual combinations to reactions array (avoiding duplicates)
    const existingReactionIds = new Set(updatedElement.reactions.map(r => r.id).filter(Boolean));
    
    newIndividualCombinations.forEach(combination => {
      if (!existingReactionIds.has(combination.id)) {
        updatedElement.reactions.push({ ...combination });
      }
    });
    
    return updatedElement;
  }

  /**
   * Get all individual load case combinations from an element
   * @param element - The structural element
   * @returns Array of individual load combinations
   */
  getIndividualCombinations(element: Element): LoadCombination[] {
    if (!element.loadCombinations) return [];
    
    return element.loadCombinations.filter(combination => 
      combination.combinationType === 'Reaction' && 
      combination.loadCaseFactors.length === 1 &&
      combination.isActive !== false
    );
  }

  /**
   * Get summary of load combination analysis
   * @param element - The structural element
   * @returns Summary object with counts and details
   */
  getCombinationSummary(element: Element): {
    totalCombinations: number;
    individualCombinations: number;
    multiFactorCombinations: number;
    loadCaseTypes: LoadCaseType[];
    missingIndividualCombinations: LoadCaseType[];
  } {
    const totalCombinations = element.loadCombinations?.length ?? 0;
    const individualCombinations = this.getIndividualCombinations(element);
    const multiFactorCombinations = element.loadCombinations?.filter(
      combination => combination.loadCaseFactors.length > 1 && combination.isActive !== false
    ) ?? [];
    
    // Get all load case types from appliedLoads
    const allLoadCaseTypes = new Set<LoadCaseType>();
    if (element.appliedLoads) {
      element.appliedLoads.forEach(appliedLoad => {
        appliedLoad.forces.forEach(force => {
          allLoadCaseTypes.add(force.loadCase);
        });
      });
    }
    
    // Find missing individual combinations
    const existingIndividualTypes = new Set(
      individualCombinations.map(c => c.loadCaseFactors[0].loadCaseType)
    );
    const missingIndividualCombinations = Array.from(allLoadCaseTypes)
      .filter(type => !existingIndividualTypes.has(type));
    
    return {
      totalCombinations,
      individualCombinations: individualCombinations.length,
      multiFactorCombinations: multiFactorCombinations.length,
      loadCaseTypes: Array.from(allLoadCaseTypes),
      missingIndividualCombinations
    };
  }
}
// Represents all the input parameters for a single beam analysis.
export interface BeamInput {
  Name: string;
  sectionName: string;
  Span: number;
  E: number; // Modulus of Elasticity
  I: number; // Moment of Inertia
  A: number; // Cross-sectional Area
  Supports: Support[];
  Loads: Load[];
}


export interface ElementInput {
  name: string;
  sectionName: string;
  span: number;
  type: string;
  spacing: number;
  loads: Load[];
  Supports: Support[];
  designParameters?: DesignParameters; // Optional design parameters for the element

}
// Represents the output results from a beam analysis.
export interface BeamOutput {
  reactions: { [key: string]: number[]; }; // e.g. { "0": [Fx, Fy, Mz], "6": [Fx, Fy, Mz] }
  max_bending: number[]; // [position, value]
  max_shear: number[]; // [position, value]
  max_deflection: number[]; // [position, value]
  bending_moment: number[];
  shear_force: number[];
  normal_force: number[];
  deflection: number[];
  x_values: number[];
}

/**
*  Design parameters for structural analysis and design
*/
export interface DesignParameters {
  //Load_combination: string[]; // Array of load combination names
  countryOfStandard: string; // e.g., "New Zealand", "Australia", "United States"
  materialType: MaterialType;

  // Environmental conditions
  moistureCondition?: 'dry' | 'wet' | 'moist';
  temperatureCondition?: 'normal' | 'elevated' | 'high';

  // Design factors
  capacityFactor?: number; // φ factor for strength reduction
  loadingScenario?: number; // Loading scenario identifier


  // Member properties
  memberType?: string; // e.g., "solid timber", "glulam", "steel beam"
  memberSpacing?: number; // Spacing between members (m)
  memberCount?: number; // Number of members


  // Restraint conditions
  lateralRestraintSpacing?: number; // Spacing of lateral restraints (m)
  torsionalRestraintSpacing?: number; // Spacing of torsional restraints (m)


  // Additional design parameters
  serviceabilityLimits?: {
    deflectionLimit?: number; // L/xxx
    vibrationLimit?: number;
  };

  // Code specific parameters
  codeParameters?: { [key: string]: any; };
}

import type { StatusMessage } from './types';

export interface Element {
    // Basic element identification
    id?: string; // Optional - Firestore will generate this on creation
    name: string;
    type: string; // beam, column, slab, etc.


    // Geometric properties
    sectionName: string; // Section designation (e.g., "240x90 SG8 Timber")
    span: number;
    spacing: number; 
    section_count: number; // Number of sections in the element


    //  section properties
    sections: SectionProperties[]; // Array to support multiple sections 


    // Material properties (legacy - kept for backward compatibility)
    E?: number; // Modulus of Elasticity
    I?: number; // Moment of Inertia
    A?: number; // Cross-sectional Area


    // Structural definitions : supports Loads and Actions
    supports: Support[];
    loads?: Load[];

    //loadCases: LoadCase[];
    loadCombinations: LoadCombination[];
    appliedLoads: AppliedLoads[];

    //Design Methodology 
    designMethod?: DesignMethodType;
    buildingCode?: BuildingCodeType;
    designParameters?: DesignParameters; // Optional design parameters for this element
    //noofSections?: number; 

    // Analysis results (computed)
    // reactions?: { [key: string]: number[] }; // e.g. { "0": [Fx, Fy, Mz], "6": [Fx, Fy, Mz] }
    // max_bending?: number[]; // [position, value]
    // max_shear?: number[]; // [position, value]
    // max_deflection?: number[]; // [position, value]
    // bending_moment?: number[];
    // shear_force?: number[];
    // normal_force?: number[];
    // deflection?: number[];
    // x_values?: number[];
    // Load combination results
    governingCombination?: string; // ID of the governing load combination
    combinationResults?: { [combinationId: string]: BeamOutput; };
    projectId?: string;
    reactions: LoadCombination[];
    
    // Design results
    designResults?: DesignOutput[];
  // New optional status message attached to the element (for UI feedback & audit)
  statusMessage?: StatusMessage;
    
    // Persistence tracking
    isSaved?: boolean; // True if element has been saved to Firestore
    firestoreId?: string; // Firestore document ID
    createdAt?: any; // Firestore timestamp
    updatedAt?: any; // Firestore timestamp  
    version?: number; // Version number for history tracking
    previousVersion?: number; // Previous version number
    isActive?: boolean; // For soft delete
    archivedAt?: any; // Firestore timestamp when archived
}

// Helper type for elements that have been retrieved from Firestore (guaranteed to have ID)
export interface ElementWithId extends Omit<Element, 'id'> {
    id: string; // Required after retrieval from Firestore
}

// Design output interface for structural element design API response
export interface DesignOutput {
  capacity_data: {
    capacities: {
      bending_strength: number;
      shear_strength: number;
      k1_factor?: number;
      k2_factor?: number;
      k3_factor?: number;
      k4_factor?: number;
      k5_factor?: number;
      k6_factor?: number;
      k7_factor?: number;
      k8_factor?: number;
      k9_factor?: number;
      k12_factor?: number;
      fb?: number;
      fs?: number;
      Z?: number;
      Non_of_Sections?: number;
      Number_of_Members?: number;
      member_spacing?: number;
      phi?: number;
    };
    utilization: {
      bending_strength: number;
      shear_strength: number;
    };
    status: 'PASS' | 'FAIL';
  };
  bending_check: string;
  shear_check: string;
  bending_capacity: number;
  shear_capacity: number;
  reactions: { [key: string]: number[] };
  max_bending: number[];
  max_shear: number[];
  max_deflection: number[];
  bending_moment: number[];
  shear_force: number[];
  normal_force: number[];
  deflection: number[];
  x_values: number[];
  combinationName?: string; // Added to track which combination this result belongs to
  combinationType?: 'Ultimate' | 'Serviceability' | 'Other' | 'Reaction';
  loadCaseType?: LoadCaseType;
}
