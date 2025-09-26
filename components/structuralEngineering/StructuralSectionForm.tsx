import React, { useState } from 'react';
// Define form modes including a duplicate option
export type Mode = 'create' | 'edit' | 'duplicate';
import { SectionProperties, MaterialType, SectionShape } from '../../customTypes/SectionProperties';
import { FormCollapsibleSectionWithStagedSummary } from '../utility/CollapsibleSection';

interface StructuralSectionFormProps {
  initialData?: SectionProperties;
  sectionsList?: SectionProperties[];
  onSubmit: (data: SectionProperties, mode: Mode) => void;
  onCancel?: () => void;
  mode: Mode;
}

const defaultSection: SectionProperties = {
  id : '', // id will be set by the database
  name: '',
  material: MaterialType.Steel,
  shape: SectionShape.Rectangular,
  // All other fields are optional and can be left undefined
  d: 0,
  b: 0,
  Ix: 0,
  Iy: 0,
  Zx: 0,
  Zy: 0,
  A: 0,
};

const inputClasses = "block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-teal-200/50";
const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

export const StructuralSectionForm: React.FC<StructuralSectionFormProps> = ({ initialData, sectionsList, onSubmit, onCancel, mode }) => {
  const [section, setSection] = useState<SectionProperties>(initialData || defaultSection);
  // Names of existing sections for edit mode
  const sectionNames = sectionsList ? sectionsList.map(sec => sec.name) : [];

  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSection(prev => ({ ...prev, [name]: isNaN(Number(value)) || value === '' ? value : Number(value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSection(section); // Reset ID for new section
    // Call the onSubmit prop with the current section data and mode
    if (onSubmit)
    onSubmit(section, mode);
  };

  // Helper to determine which properties to show based on material type
  const isSteel = section.material === MaterialType.Steel;
  const isReinforcedConcrete = section.material === MaterialType.ReinforcedConcrete;
  const isTimber = section.material === MaterialType.Timber;

  return (
    <div className="flex flex-col h-full max-h-[75vh]">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-primary to-primary-focus text-white p-4 rounded-t-xl shadow-lg z-10">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold capitalize">{mode} Structural Section</h2>
            <p className="text-primary-content/80 text-sm">Define material and geometric properties</p>
          </div>
          <div className="text-primary-content/60">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
            </svg>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-base-50 min-h-0">
          {/* Edit Mode: select existing section */}
          {(mode === 'edit' || mode === 'duplicate') && sectionsList && sectionsList.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-warning/20">
              <label htmlFor="select-section" className={labelClasses + " text-warning font-semibold"}>Select Existing Section</label>
              <select
                id="select-section"
                value={section.name}
                onChange={e => {
                const sel = sectionsList.find(sec => sec.name === e.target.value);
                if (sel) setSection(sel);
                }}
                className={inputClasses + " border-warning/30 focus:border-warning"}
              >
                <option value="" disabled>Select Section</option>
                {sectionNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          )}

          <FormCollapsibleSectionWithStagedSummary 
            title="Basic Properties" 
            color="bg-gray-50/80" 
            defaultStage="open"
            summaryItems={[
              { label: 'Name', value: section.name || 'Not specified' },
              { label: 'Material', value: section.material === 'reinforced-concrete' ? 'Reinforced Concrete' : section.material?.charAt(0).toUpperCase() + section.material?.slice(1) || 'Not selected' },
              { label: 'Shape', value: section.shape?.charAt(0).toUpperCase() + section.shape?.slice(1).replace('-', ' ') || 'Not selected' },
              { label: 'Grade', value: section.material_grade || 'Not specified' }
            ]}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="name" className={labelClasses}>Section Name</label><input id="name" name="name" value={section.name} onChange={handleChange} className={inputClasses} placeholder="e.g. 300x200 UC"/></div>
              <div>
                  <label htmlFor="material" className={labelClasses}>Material Type</label>
                  <select id="material" name="material" value={section.material} onChange={handleChange} className={inputClasses}>
                    {Object.values(MaterialType).map(m => (
                      <option key={m} value={m}>
                        {m === 'reinforced-concrete' ? 'Reinforced Concrete' : 
                         m.charAt(0).toUpperCase() + m.slice(1)}
                      </option>
                    ))}
                  </select>
              </div>
              <div>
                  <label htmlFor="shape" className={labelClasses}>Section Shape</label>
                  <select id="shape" name="shape" value={section.shape} onChange={handleChange} className={inputClasses}>
                    {Object.values(SectionShape).map(s => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                  </select>
              </div>
              <div><label htmlFor="material_grade" className={labelClasses}>Material Grade</label><input id="material_grade" name="material_grade" value={section.material_grade || ''} onChange={handleChange} className={inputClasses} placeholder={isSteel ? "e.g. Grade 300" : isReinforcedConcrete ? "e.g. C25/30" : "e.g. SG8"}/></div>
              <div><label htmlFor="country" className={labelClasses}>Design Code/Country</label><input id="country" name="country" value={section.country || ''} onChange={handleChange} className={inputClasses} placeholder="e.g. AS 3600, BS 8110"/></div>
            </div>
          </FormCollapsibleSectionWithStagedSummary>

          {/* Material-specific strength properties */}
          {isSteel && (
            <FormCollapsibleSectionWithStagedSummary 
              title="Steel Material Properties" 
              color="bg-slate-50/80"
              summaryItems={[
                { label: 'E', value: section.elastic_modulus_E ? `${section.elastic_modulus_E} MPa` : 'Not specified' },
                { label: 'Yield', value: section.yield_strength ? `${section.yield_strength} MPa` : 'Not specified' },
                { label: 'Ultimate', value: section.ultimate_strength ? `${section.ultimate_strength} MPa` : 'Not specified' }
              ]}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClasses}>Elastic Modulus E (MPa)</label><input name="elastic_modulus_E" type="number" value={section.elastic_modulus_E || ''} onChange={handleChange} className={inputClasses} placeholder="200000"/></div>
                <div><label className={labelClasses}>Yield Strength (MPa)</label><input name="yield_strength" type="number" value={section.yield_strength || ''} onChange={handleChange} className={inputClasses} placeholder="300"/></div>
                <div><label className={labelClasses}>Ultimate Strength (MPa)</label><input name="ultimate_strength" type="number" value={section.ultimate_strength || ''} onChange={handleChange} className={inputClasses} placeholder="430"/></div>
                <div><label className={labelClasses}>Mass per Metre (kg/m)</label><input name="mass_per_metre" type="number" value={section.mass_per_metre || ''} onChange={handleChange} className={inputClasses}/></div>
              </div>
            </FormCollapsibleSectionWithStagedSummary>
          )}

          {isTimber && (
            <FormCollapsibleSectionWithStagedSummary 
              title="Timber Material Properties" 
              color="bg-amber-50/80"
              summaryItems={[
                { label: 'E', value: section.elastic_modulus_E ? `${section.elastic_modulus_E} MPa` : 'Not specified' },
                { label: 'Bending', value: section.Bending_Parallel_to_Grain ? `${section.Bending_Parallel_to_Grain} MPa` : 'Not specified' },
                { label: 'Compression', value: section.Compression_parallel_to_Grain ? `${section.Compression_parallel_to_Grain} MPa` : 'Not specified' }
              ]}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClasses}>Elastic Modulus E (MPa)</label><input name="elastic_modulus_E" type="number" value={section.elastic_modulus_E || ''} onChange={handleChange} className={inputClasses} placeholder="12000"/></div>
                <div><label className={labelClasses}>Mass per Metre (kg/m)</label><input name="mass_per_metre" type="number" value={section.mass_per_metre || ''} onChange={handleChange} className={inputClasses}/></div>
                <div><label className={labelClasses}>Bending Parallel to Grain (MPa)</label><input name="Bending_Parallel_to_Grain" type="number" value={section.Bending_Parallel_to_Grain || ''} onChange={handleChange} className={inputClasses}/></div>
                <div><label className={labelClasses}>Tension Parallel to Grain (MPa)</label><input name="Tension_parallel_to_Grain" type="number" value={section.Tension_parallel_to_Grain || ''} onChange={handleChange} className={inputClasses}/></div>
                <div><label className={labelClasses}>Compression Parallel to Grain (MPa)</label><input name="Compression_parallel_to_Grain" type="number" value={section.Compression_parallel_to_Grain || ''} onChange={handleChange} className={inputClasses}/></div>
                <div><label className={labelClasses}>Shear Parallel to Grain (MPa)</label><input name="Shear_Parallel_to_Grain" type="number" value={section.Shear_Parallel_to_Grain || ''} onChange={handleChange} className={inputClasses}/></div>
              </div>
            </FormCollapsibleSectionWithStagedSummary>
          )}

          {isReinforcedConcrete && (
            <FormCollapsibleSectionWithStagedSummary 
              title="Concrete Material Properties" 
              color="bg-stone-50/80"
              summaryItems={[
                { label: 'f\'c', value: section.ultimate_strength ? `${section.ultimate_strength} MPa` : 'Not specified' },
                { label: 'E', value: section.elastic_modulus_E ? `${section.elastic_modulus_E} MPa` : 'Not specified' },
                { label: 'fy', value: section.yield_strength ? `${section.yield_strength} MPa` : 'Not specified' }
              ]}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClasses}>Concrete Compressive Strength (MPa)</label><input name="ultimate_strength" type="number" value={section.ultimate_strength || ''} onChange={handleChange} className={inputClasses} placeholder="25"/></div>
                <div><label className={labelClasses}>Elastic Modulus E (MPa)</label><input name="elastic_modulus_E" type="number" value={section.elastic_modulus_E || ''} onChange={handleChange} className={inputClasses} placeholder="30000"/></div>
                <div><label className={labelClasses}>Steel Yield Strength (MPa)</label><input name="yield_strength" type="number" value={section.yield_strength || ''} onChange={handleChange} className={inputClasses} placeholder="500"/></div>
                <div><label className={labelClasses}>Mass per Metre (kg/m)</label><input name="mass_per_metre" type="number" value={section.mass_per_metre || ''} onChange={handleChange} className={inputClasses} placeholder="2400"/></div>
              </div>
            </FormCollapsibleSectionWithStagedSummary>
          )}

          {/* Basic Geometric Properties - Common to all materials */}
          <FormCollapsibleSectionWithStagedSummary 
            title="Basic Geometric Properties" 
            color="bg-blue-50/80"
            summaryItems={[
              { label: 'Depth', value: section.d ? `${section.d} mm` : 'Not specified' },
              { label: 'Width', value: section.b ? `${section.b} mm` : 'Not specified' },
              { label: 'Area', value: section.A ? `${section.A} mm²` : 'Not specified' }
            ]}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClasses}>Overall Depth d (mm)</label><input name="d" type="number" value={section.d || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Overall Width b (mm)</label><input name="b" type="number" value={section.b || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Cross-sectional Area A (mm²)</label><input name="A" type="number" value={section.A || ''} onChange={handleChange} className={inputClasses}/></div>
              {(isSteel || section.shape === SectionShape.Hollow) && (
                <>
                  <div><label className={labelClasses}>Wall Thickness t (mm)</label><input name="t" type="number" value={section.t || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Web Thickness (mm)</label><input name="web_thickness" type="number" value={section.web_thickness || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Flange Thickness (mm)</label><input name="flange_thickness" type="number" value={section.flange_thickness || ''} onChange={handleChange} className={inputClasses}/></div>
                </>
              )}
            </div>
          </FormCollapsibleSectionWithStagedSummary>

          {/* Section Properties - Common to all materials */}
          <FormCollapsibleSectionWithStagedSummary 
            title="Section Properties" 
            color="bg-purple-50/80"
            summaryItems={[
              { label: 'Ix', value: section.Ix ? `${section.Ix} mm⁴` : 'Not specified' },
              { label: 'Iy', value: section.Iy ? `${section.Iy} mm⁴` : 'Not specified' },
              { label: 'Zx', value: section.Zx ? `${section.Zx} mm³` : 'Not specified' },
              { label: 'Zy', value: section.Zy ? `${section.Zy} mm³` : 'Not specified' }
            ]}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClasses}>Ix - Moment of Inertia X-axis (mm⁴)</label><input name="Ix" type="number" value={section.Ix || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Iy - Moment of Inertia Y-axis (mm⁴)</label><input name="Iy" type="number" value={section.Iy || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Zx - Section Modulus X-axis (mm³)</label><input name="Zx" type="number" value={section.Zx || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Zy - Section Modulus Y-axis (mm³)</label><input name="Zy" type="number" value={section.Zy || ''} onChange={handleChange} className={inputClasses}/></div>
              {isSteel && (
                <>
                  <div><label className={labelClasses}>J - Torsional Constant (mm⁴)</label><input name="J" type="number" value={section.J || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Sx - Plastic Section Modulus X-axis (mm³)</label><input name="Sx" type="number" value={section.Sx || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Sy - Plastic Section Modulus Y-axis (mm³)</label><input name="Sy" type="number" value={section.Sy || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Root Radius r (mm)</label><input name="r" type="number" value={section.r || ''} onChange={handleChange} className={inputClasses}/></div>
                </>
              )}
            </div>
          </FormCollapsibleSectionWithStagedSummary>

          {/* Reinforced Concrete Specific Properties */}
          {isReinforcedConcrete && (
            <>
              <FormCollapsibleSectionWithStagedSummary 
                title="Reinforced Concrete Geometric Properties" 
                color="bg-orange-50/80"
                summaryItems={[
                  { label: 'b', value: section.b_mm ? `${section.b_mm} mm` : 'Not specified' },
                  { label: 'd', value: section.d_mm ? `${section.d_mm} mm` : 'Not specified' },
                  { label: 'h', value: section.h_mm ? `${section.h_mm} mm` : 'Not specified' },
                  { label: 'A', value: section.A_mm2 ? `${section.A_mm2} mm²` : 'Not specified' }
                ]}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClasses}>Width b_mm (mm)</label><input name="b_mm" type="number" value={section.b_mm || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Effective Depth d_mm (mm)</label><input name="d_mm" type="number" value={section.d_mm || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Overall Height h_mm (mm)</label><input name="h_mm" type="number" value={section.h_mm || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Distance to Compression Steel d'_mm (mm)</label><input name="d_prime_mm" type="number" value={section.d_prime_mm || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Gross Area A_mm2 (mm²)</label><input name="A_mm2" type="number" value={section.A_mm2 || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Moment of Inertia I_mm4 (mm⁴)</label><input name="I_mm4" type="number" value={section.I_mm4 || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Lever Arm z_mm (mm)</label><input name="z_mm" type="number" value={section.z_mm || ''} onChange={handleChange} className={inputClasses}/></div>
                </div>
              </FormCollapsibleSectionWithStagedSummary>

              <FormCollapsibleSectionWithStagedSummary 
                title="Reinforcement Properties" 
                color="bg-red-50/80"
                summaryItems={[
                  { label: 'As_req', value: section.As_required_mm2 ? `${section.As_required_mm2} mm²` : 'Not specified' },
                  { label: 'As_prov', value: section.As_provided_mm2 ? `${section.As_provided_mm2} mm²` : 'Not specified' },
                  { label: 'Main Bar', value: section.bar_dia_mm ? `${section.bar_dia_mm}mm` : 'Not specified' },
                  { label: 'No. Bars', value: section.n_bars ? `${section.n_bars}` : 'Not specified' }
                ]}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClasses}>Required Tensile Steel As_req (mm²)</label><input name="As_required_mm2" type="number" value={section.As_required_mm2 || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Provided Tensile Steel As_prov (mm²)</label><input name="As_provided_mm2" type="number" value={section.As_provided_mm2 || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Required Compression Steel As'_req (mm²)</label><input name="As_prime_mm2" type="number" value={section.As_prime_mm2 || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Provided Compression Steel As'_prov (mm²)</label><input name="As_provided_prime_mm2" type="number" value={section.As_provided_prime_mm2 || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Minimum Tensile Steel As_min (mm²)</label><input name="As_min_mm2" type="number" value={section.As_min_mm2 || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Maximum Tensile Steel As_max (mm²)</label><input name="As_max_mm2" type="number" value={section.As_max_mm2 || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Number of Bars</label><input name="n_bars" type="number" value={section.n_bars || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Main Bar Diameter (mm)</label><input name="bar_dia_mm" type="number" value={section.bar_dia_mm || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Link/Stirrup Diameter (mm)</label><input name="bar2_dia_mm" type="number" value={section.bar2_dia_mm || ''} onChange={handleChange} className={inputClasses}/></div>
                  <div><label className={labelClasses}>Compression Bar Diameter (mm)</label><input name="bar3_dia_mm" type="number" value={section.bar3_dia_mm || ''} onChange={handleChange} className={inputClasses}/></div>
                </div>
              </FormCollapsibleSectionWithStagedSummary>
            </>
          )}
        </div>
        
        {/* Fixed Footer with action buttons */}
        <div className="flex-shrink-0 bg-white border-t border-base-300 p-4 rounded-b-xl shadow-lg z-10">
          <div className="flex justify-between items-center">
            <div className="text-sm text-base-content/60">
              <span className="font-medium">Material:</span> {section.material === 'reinforced-concrete' ? 'Reinforced Concrete' : section.material.charAt(0).toUpperCase() + section.material.slice(1)}
              {section.material_grade && <span> • <span className="font-medium">Grade:</span> {section.material_grade}</span>}
            </div>
            <div className="flex gap-3">
              {onCancel && (
                <button 
                  type="button" 
                  onClick={onCancel} 
                  className="px-6 py-2.5 bg-base-200 text-base-content font-semibold rounded-lg hover:bg-base-300 transition-colors border border-base-300"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-focus transition-colors shadow-md capitalize"
              >
                {mode} Section
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StructuralSectionForm;