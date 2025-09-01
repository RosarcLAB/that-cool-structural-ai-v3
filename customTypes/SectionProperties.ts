
// Cross-section properties interface
export interface SectionProperties {
  // Additional geometric/section properties (optional, from Python class)
  
  id : string; // Unique identifier for the section
  name: string;
  material: MaterialType;
  shape: SectionShape;
  material_grade?: string; // Material grade (e.g., "SG8", "Grade 300", "C25/30")

  country? : string;
  community?: string; // Optional community or region for localized standards

 

  // material/strength properties (optional)
  elastic_modulus_E?: number; 
  yield_strength?: number;
  ultimate_strength?: number;
  mass_per_metre?: number;
  Bending_Parallel_to_Grain?: number;
  Tension_parallel_to_Grain?: number;
  Compression_parallel_to_Grain?: number;
  Shear_Parallel_to_Grain?: number;
  compressopn_perpendicular_to_grain?: number;
  Bearing_strength_perpendicular_to_grain?: number;
  Tension_perpendicular_to_grain?: number;
  elastic_modulus_Short_term?: number;
  elastic_modulus_Short_term_Lower_bound?: number;

  // Geometric properties
  /**
   * Represents the overall dimensions of the section.
   * 
   * @property height - Overall height of the section in mm.
   */
  d: number;  

  /**
   * @property width - Overall width of the section in mm.
   */
  b: number;  

  /**
  * @property thickness - Wall thickness for hollow sections in mm.
  * This is optional and only applies to hollow sections.
  */
  t?: number; // Wall thickness for hollow sections (mm)

  /**
   * @property web_thickness - Thickness of the web in mm (for I-beams, channels, etc.).
    * This is optional and only applies to sections with webs.
   */


  web_thickness?: number; // mm
  flange_thickness?: number; // mm
  Ix: number; // Second moment of area about x-axis (mm⁴)
  Iy: number; // Second moment of area about y-axis (mm⁴)
  Zx: number; // Section modulus about x-axis (mm³)
  Zy: number; // Section modulus about y-axis (mm³)
  A: number; // Cross-sectional area (mm²)
  J?: number; // Torsional constant (mm⁴)
  Sx?: number; // Plastic section modulus about x-axis (mm³)
  Sy?: number; // Plastic section modulus about y-axis (mm³)
  H?: number; // Warping constant (mm⁶)
  x?: number; // Torsional index (mm³)
  r?: number; // root radius (mm)
  d1?: number; // depth between fillets (mm) 


  // Additional properties for advanced analysis
  Cw?: number; // Warping constant (mm⁶)
  rx?: number; // Radius of gyration about x-axis (mm)
  ry?: number; // Radius of gyration about y-axis (mm)
}// Cross-section material types

export enum MaterialType {
  Steel = 'steel',
  Concrete = 'concrete',
  Timber = 'timber',
  Aluminum = 'aluminum',
  Composite = 'composite'
}


// Cross-section shapes
export enum SectionShape {
  Rectangular = 'rectangular',
  Circular = 'circular',
  IBeam = 'i-beam',
  TBeam = 't-beam',
  LBeam = 'l-beam',
  Channel = 'channel',
  Hollow = 'hollow',
  Custom = 'custom'
}

