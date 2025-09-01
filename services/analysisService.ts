// services/analysisService.ts: Calls a remote backend for beam analysis.

import { type Load, type Support, type BeamInput,  type BeamOutput, LoadType, SupportFixityType , Element as StructuralElement, DesignOutput, LoadCombination} from '../customTypes/structuralElement'
const STRUCTURAL_SERVICES_URL = 'https://rosarcbim-structural-api-701061055216.europe-west2.run.app/';
 
/**
 * Calls a remote beam analysis API to get calculation results.
 * This function handles all necessary data preparation, including unit conversions.
 * @param input - The beam properties and loads, with E in GPa.
 * @returns A promise that resolves to the analysis output from the API.
 */
export const analyzeBeam = async (input: BeamInput): Promise<BeamOutput> => {
  console.log("Starting analysis for beam:", input.Name);
  try {
    // Construct the payload in the format required by the API.
    const apiPayload = convertBeamInputToApiPayload(input);

    console.log("Payload sent to API:", JSON.stringify(apiPayload, null, 2));

    const response = await fetch(`${STRUCTURAL_SERVICES_URL}/analyse`, {
        method: 'POST',
        mode: 'cors', // Explicitly set CORS mode to potentially help with fetch errors.
        headers: {
            "Content-Type": "application/json",
            'Accept': 'application/json',
        },
        body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
        let errorBodyText = 'Could not read error body from API response.';
        try {
            errorBodyText = await response.text();
        } catch (e) {
            // Ignore if can't read body
        }
        console.error("API Error Response:", errorBodyText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}. Details: ${errorBodyText}`);
    }

    const data = await response.json();
    console.log("API response:", JSON.stringify(data, null, 2));

    const output = parseApiOutput(data);
    return output;

  } catch (error) {
    console.error("Failed to fetch from analysis API:", error);
    if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
             throw new Error(`Network Error: Could not connect to the analysis service at ${STRUCTURAL_SERVICES_URL}. Please check your network connection.`);
        }
        throw new Error(`An error occurred during analysis: ${error.message}`);
    }
    throw new Error("An unknown error occurred while connecting to the analysis service.");
  }
};

//#region Internal Helper Functions

/**
* Converts the application's BeamInput format to the specific JSON payload
* format expected by the external structural analysis API.
*
* This involves several key transformations:
* 1. Converts Modulus of Elasticity (E) from GPa to Pascals (Pa).
* 2. Maps support fixity from string enums ('Pinned', 'Roller', etc.) to numerical arrays.
* 3. Maps load types from string enums ('UDL', 'Point Load') to API-specific strings ('UDL_Vert').
* 4. Converts all load magnitudes to negative values to represent downward forces.
* 5. Converts all position strings to numbers.
* 6. Formats the 'magnitude' and 'position' fields into the specific data structure
*    (single number vs. array) required by the API for each load type.
*
* @param {BeamInput} input The beam data from the application.
* @returns {object} The formatted payload ready to be sent to the API.
*/
function convertBeamInputToApiPayload(input: BeamInput) {
  const fixityMap: Record<SupportFixityType, [number, number, number]> = {
    [SupportFixityType.Pinned]: [1, 1, 0],
    [SupportFixityType.Roller]: [0, 1, 0],
    [SupportFixityType.Fixed]:  [1, 1, 1],
    [SupportFixityType.Free]:   [0, 0, 0],
  };
  
  const loadTypeMap: Record<LoadType, string> = {
    [LoadType.UDL]: 'UDL_Vert',
    [LoadType.PointLoad]: 'PointLoad_Vert',
    [LoadType.TrapezoidalLoad]: 'TrapezoidalLoad_Vert',
  };

  return {
    span: input.Span,
    E:    input.E * 1e9, // Convert GPa to Pa
    I:    input.I,
    A:    input.A,
    supports: input.Supports.map(s => ({
      position: s.position,
      fixity:   fixityMap[s.fixity]
    })),
    loads: input.Loads.map(l => {
      // API expects negative magnitudes for downward loads.
      let apiMagnitude;
      if (l.type === LoadType.PointLoad) {
          apiMagnitude = -l.magnitude[0];
      } else if (l.type === LoadType.UDL) {
          // The API for UDL_Vert expects a single float for magnitude.
          apiMagnitude = -l.magnitude[0];
      } else { // TrapezoidalLoad
          // TrapezoidalLoad_Vert expects an array [start_magnitude, end_magnitude].
          apiMagnitude = l.magnitude.map(m => -m);
      }
      
      // API expects a single number for point load position, an array for others.
      // All position strings must be converted to numbers.
      const apiPosition = l.type === LoadType.PointLoad
        ? Number(l.position[0])           // Single number for Point Load
        : l.position.map(p => Number(p)); // Array for UDL and Trapezoidal

      return {
        type:      loadTypeMap[l.type],
        magnitude: apiMagnitude,
        position:  apiPosition,
      };
    })
  };
}

/**
* This function parses the API response and returns a structured BeamOutput object.
* It includes checks to ensure that all expected array fields are actually arrays,
* providing empty arrays or default values as a fallback to prevent runtime errors.
* @param {any} res The raw JSON response from the API.
* @returns {BeamOutput} A structured and safe BeamOutput object.
*/
function parseApiOutput(res: any): BeamOutput {
  return {
    reactions: res.reactions || {},
    max_bending: Array.isArray(res.max_bending) ? res.max_bending : [0, 0],
    max_shear: Array.isArray(res.max_shear) ? res.max_shear : [0, 0],
    max_deflection: Array.isArray(res.max_deflection) ? res.max_deflection : [0, 0],
    bending_moment: Array.isArray(res.bending_moment) ? res.bending_moment : [],
    shear_force: Array.isArray(res.shear_force) ? res.shear_force : [],
    normal_force: Array.isArray(res.normal_force) ? res.normal_force : [],
    deflection: Array.isArray(res.deflection) ? res.deflection : [],
    x_values: Array.isArray(res.x_values) ? res.x_values : [],
  };
}
//#endregion


// Convert E from GPa to Pa
function convertEToPa(E: number): number {
  return typeof E === 'number' ? E * 1e9 : E;
}

// Convert MPa to Pa
function convertMPaToPa(MPa: number): number {
  return typeof MPa === 'number' ? MPa * 1e6 : MPa;
}

//#region structural element design API call

// API expected load combination types
enum ApiLoadCombination {
  PERMANENT = "1.35G",
  ROOF_LIVE_DISTRIBUTED = "roof_distributed_1.2G+1.5Q",
  ROOF_LIVE_CONCENTRATED = "roof_concentrated_1.2G+1.5Q",
  FLOOR_LIVE_DISTRIBUTED = "floor_distributed_1.2G+1.5Q",
  FLOOR_LIVE_CONCENTRATED = "floor_concentrated_1.2G+1.5Q",
  PERMANENT_IMPOSED = "permanent_1.2G+ψlQ",
  PERMANENT_WIND_IMPOSED = "permanent_wind_imposed_1.2G+ψcQ+Wu",
  PERMANENT_WIND_REVERSAL = "permanent_wind_reversal_0.9G+Wu",
  PERMANENT_EARTHQUAKE_IMPOSED = "permanent_earthquake_imposed_G+Eu+ψcQ",
  FIRE = "fire"
}

// Map load combination based on load case factors to API format
function mapLoadCombinationToApiFormat(combination: LoadCombination): string {
  const factors = combination.loadCaseFactors || [];
  
  // Helper function to check if two numbers are approximately equal
  const isApproximately = (a: number, b: number, tolerance = 0.01) => Math.abs(a - b) <= tolerance;
  
  // Check for specific patterns in the factors
  const deadFactor = factors.find(f => f.loadCaseType === 'Dead')?.factor || 0;
  const liveFactor = factors.find(f => f.loadCaseType === 'Live')?.factor || 0;
  const windFactor = factors.find(f => f.loadCaseType === 'Wind')?.factor || 0;
  const seismicFactor = factors.find(f => f.loadCaseType === 'Seismic')?.factor || 0;
  
  console.log(`Analyzing combination "${combination.name}": Dead=${deadFactor}, Live=${liveFactor}, Wind=${windFactor}, Seismic=${seismicFactor}`);
  
  // Determine combination type based on factors
  if (isApproximately(deadFactor, 1.35) && isApproximately(liveFactor, 0) && isApproximately(windFactor, 0) && isApproximately(seismicFactor, 0)) {
    return ApiLoadCombination.PERMANENT;
  }
  
  if (isApproximately(deadFactor, 1.2) && isApproximately(liveFactor, 1.5) && isApproximately(windFactor, 0) && isApproximately(seismicFactor, 0)) {
    // Check combination name or description for hints about load type
    const nameOrDesc = (combination.name + ' ' + (combination.description || '')).toLowerCase();
    
    if (nameOrDesc.includes('roof') && nameOrDesc.includes('distributed')) {
      return ApiLoadCombination.ROOF_LIVE_DISTRIBUTED;
    }
    if (nameOrDesc.includes('roof') && nameOrDesc.includes('concentrated')) {
      return ApiLoadCombination.ROOF_LIVE_CONCENTRATED;
    }
    if (nameOrDesc.includes('floor') && nameOrDesc.includes('distributed')) {
      return ApiLoadCombination.FLOOR_LIVE_DISTRIBUTED;
    }
    if (nameOrDesc.includes('floor') && nameOrDesc.includes('concentrated')) {
      return ApiLoadCombination.FLOOR_LIVE_CONCENTRATED;
    }
    
    // Default to floor distributed for 1.2G + 1.5Q pattern
    return ApiLoadCombination.FLOOR_LIVE_DISTRIBUTED;
  }
  
  if (isApproximately(deadFactor, 1.2) && liveFactor > 0 && liveFactor < 1.5) {
    return ApiLoadCombination.PERMANENT_IMPOSED;
  }
  
  if (isApproximately(deadFactor, 1.2) && windFactor > 0) {
    return ApiLoadCombination.PERMANENT_WIND_IMPOSED;
  }
  
  if (isApproximately(deadFactor, 0.9) && windFactor > 0) {
    return ApiLoadCombination.PERMANENT_WIND_REVERSAL;
  }
  
  if (isApproximately(deadFactor, 1.0) && seismicFactor > 0) {
    return ApiLoadCombination.PERMANENT_EARTHQUAKE_IMPOSED;
  }
  
  if (combination.name?.toLowerCase().includes('fire') || combination.description?.toLowerCase().includes('fire')) {
    return ApiLoadCombination.FIRE;
  }
  
  console.log(`No specific pattern matched for combination "${combination.name}", using default FLOOR_LIVE_DISTRIBUTED`);
  // Default fallback - use floor distributed for most common case
  return ApiLoadCombination.FLOOR_LIVE_DISTRIBUTED;
}

// Transform Element to API format for design
export function transformElementToDesignAPI(element: StructuralElement, combination: LoadCombination) {
  // Map LoadType to API expected strings
  const loadTypeMap: Record<LoadType, string> = {
    'UDL': 'UDL_Vert',
    'Point Load': 'PointLoad_Vert', 
    'Trapezoidal Load': 'Trapezoidal_Vert',
  };

  // Map support fixity to API format
  const fixityMap: Record<SupportFixityType, [number, number, number]> = {
    Pinned:  [1, 1, 0],
    Roller:  [0, 1, 0], 
    Fixed:   [1, 1, 1],
    Free:    [0, 0, 0],
  };

  // Get the API-compatible load combination string
  const apiLoadCombination = mapLoadCombinationToApiFormat(combination);
  console.log(`Mapping combination "${combination.name}" to API format: "${apiLoadCombination}"`);

  // Transform computed loads from combination result
  const transformedLoads = combination.computedResult?.map(load => {
    // Ensure magnitude is an array
    const magnitude = Array.isArray(load.magnitude) ? 
      load.magnitude : 
      [load.magnitude];
    
    // Ensure position is an array of numbers
    const position = Array.isArray(load.position) ? 
      load.position.map(p => parseFloat(typeof p === 'string' ? p : String(p))) :
      [parseFloat(typeof load.position === 'string' ? load.position : String(load.position))];
    
    return {
      type: loadTypeMap[load.type] || 'PointLoad_Vert',
      magnitude,
      position
    };
  }) || [];

  // Transform loads to design API format (individual values, not arrays)
  const loads_N = transformedLoads.map(load => ({
    type: load.type,
    magnitude: load.magnitude.length === 1 ? load.magnitude[0] : load.magnitude,
    position: load.position.length === 1 ? load.position[0] : load.position
  }));

  // Transform supports
  const transformedSupports = element.supports.map(support => ({
    position: support.position,
    fixity: fixityMap[support.fixity as SupportFixityType],
    kx: null,
    ky: null
  }));

  // Note: convertMmToM helper removed (unused) to keep file minimal; conversions done inline where needed.

  // Transform sections (use first section if available)
  const transformedSections = element.sections.map(section => ({
    name: section.name,
    material: section.material?.toLowerCase() || 'timber',
    shape: section.shape?.toLowerCase() || 'rectangular', 
    grade: section.material_grade || 'SG8',
    E: convertMPaToPa(section.elastic_modulus_E || 9000.0),
    height: section.d || 240,
    width: section.b || 90,
    Ix: section.Ix * element.section_count || 103680000.0,
    Iy: section.Iy || 14580000.0,   //To be rectified
    Zx: section.Zx * element.section_count || 864000.0,
    Zy: section.Zy || 324000.0, //To be rectified
    A: section.A * element.section_count || 21600.0
  }));

  return {
    name: element.name,
    section: element.sectionName,
    span: element.span,
    type: element.type.toLowerCase() || 'beam', // Ensure type is lowercase
    spacing: element.spacing,
    sections: transformedSections,
    supports: transformedSupports,
    loads: loads_N, // Loads are now passed in base units (N)
    designParameters: {
      Load_combination: [apiLoadCombination],
      countryOfStandard: element.designParameters?.countryOfStandard || "New Zealand",
      materialType: element.designParameters?.materialType?.toLowerCase() || "timber",
      moistureCondition: element.designParameters?.moistureCondition || "dry",
      temperatureCondition: element.designParameters?.temperatureCondition || "normal",
      capacityFactor: element.designParameters?.capacityFactor || 0.9,
      loadingScenario: element.designParameters?.loadingScenario || 1,
      memberType: element.designParameters?.memberType || "solid timber",
      memberSpacing: element.spacing || 1.0,
      memberCount: element.designParameters?.memberCount || 1,
      lateralRestraintSpacing: element.designParameters?.lateralRestraintSpacing || 1.0,
      torsionalRestraintSpacing: element.designParameters?.torsionalRestraintSpacing || 1.0
    }
  };
}

// Design a structural element for a specific load combination
export async function designStructuralElement(element: StructuralElement, combination: LoadCombination): Promise<DesignOutput> {
  const apiPayload = transformElementToDesignAPI(element, combination);
  
  console.log("Design payload sent to API:", JSON.stringify(apiPayload, null, 2));
  
  const res = await fetch(`${STRUCTURAL_SERVICES_URL}/element`, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apiPayload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Design API failed: ${res.status} - ${errorText}`);
  }
  
  const data = await res.json();
  console.log("Design API response:", JSON.stringify(data, null, 2));
  
  // Add combination name to result for tracking
  return {
    ...data,
    combinationName: combination.name || `Combination_${Date.now()}`
  } as DesignOutput;
}

// Design all load combinations for an element
export async function designAllCombinations(element: StructuralElement): Promise<DesignOutput[]> {
  if (!element.loadCombinations || element.loadCombinations.length === 0) {
    throw new Error('No load combinations found for design');
  }

  const results: DesignOutput[] = [];
  
  // Import combination utils for computing results
  const { LoadCombinationUtils } = await import('../customTypes/structuralElement');
  const combinationUtils = new LoadCombinationUtils();
  
  for (const combination of element.loadCombinations) {
    // Skip inactive combinations
    if (combination.isActive === false) {
      continue;
    }
    
    let computedResult = combination.computedResult;
    
    // If no computed result exists, compute it now (this handles reaction combinations)
    if (!computedResult || computedResult.length === 0) {
      try {
        computedResult = combinationUtils.computeLoadCombination(element.appliedLoads || [], combination);
      } catch (error) {
        console.warn(`Failed to compute results for combination ${combination.name}:`, error);
        continue; // Skip this combination if computation fails
      }
    }
    
    // Only proceed if we have valid computed results
    if (computedResult && computedResult.length > 0) {
      try {
        // Create a combination object with computed results for design
        const combinationWithResults = { ...combination, computedResult };
        const result = await designStructuralElement(element, combinationWithResults);
        results.push(result);
      } catch (error) {
        console.error(`Design failed for combination ${combination.name}:`, error);
        // Continue with other combinations even if one fails
      }
    } else {
      console.warn(`Skipping combination ${combination.name}: No valid computed results`);
    }
  }
  
  return results;
}

// Save element to database (placeholder - implement based on your backend)
export async function saveStructuralElement(element: StructuralElement): Promise<void> {
  // Implement save functionality based on your backend API
  console.log("Saving element:", element.name);
  
  // Example implementation:
  // const res = await fetch(`${STRUCTURAL_SERVICES_URL}/elements`, {
  //   method: 'POST', 
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(element),
  // });
  // 
  // if (!res.ok) {
  //   throw new Error(`Save failed: ${res.status}`);
  // }
}
//#endregion