import React, { useState } from 'react';
// Define form modes including a duplicate option
export type Mode = 'create' | 'edit' | 'duplicate';
import { SectionProperties, MaterialType, SectionShape } from '../../customTypes/SectionProperties';
import { FormCollapsibleSection } from '../utility/CollapsibleSection';

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

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto space-y-4 border p-4 rounded-xl shadow-sm bg-base-100">
          {/* Edit Mode: select existing section */}
          {(mode === 'edit' || mode === 'duplicate') && sectionsList && sectionsList.length > 0 && (
            <div>
              <label htmlFor="select-section" className={labelClasses}>Select Section</label>
              <select
                id="select-section"
                value={section.name}
                onChange={e => {
                const sel = sectionsList.find(sec => sec.name === e.target.value);
                if (sel) setSection(sel);
                }}
                className={inputClasses}
              >
                <option value="" disabled>Select Section</option>
                {sectionNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          )}

          <FormCollapsibleSection title="Basic Properties" color="bg-gray-50/50" defaultCollapsed={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="name" className={labelClasses}>Name</label><input id="name" name="name" value={section.name} onChange={handleChange} className={inputClasses}/></div>
              <div>
                  <label htmlFor="material" className={labelClasses}>Material</label>
                  <select id="material" name="material" value={section.material} onChange={handleChange} className={inputClasses}>
                    {Object.values(MaterialType).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="shape" className={labelClasses}>Shape</label>
                  <select id="shape" name="shape" value={section.shape} onChange={handleChange} className={inputClasses}>
                    {Object.values(SectionShape).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
              <div><label htmlFor="material_grade" className={labelClasses}>Material Grade</label><input id="material_grade" name="material_grade" value={section.material_grade || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label htmlFor="country" className={labelClasses}>Country</label><input id="country" name="country" value={section.country || ''} onChange={handleChange} className={inputClasses}/></div>
            </div>
          </FormCollapsibleSection>

          <FormCollapsibleSection title="Material & Strength Properties" color="bg-blue-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClasses}>Elastic Modulus E (MPa)</label><input name="elastic_modulus_E" type="number" value={section.elastic_modulus_E || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Yield Strength (MPa)</label><input name="yield_strength" type="number" value={section.yield_strength || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Ultimate Strength (MPa)</label><input name="ultimate_strength" type="number" value={section.ultimate_strength || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Mass per Metre (kg/m)</label><input name="mass_per_metre" type="number" value={section.mass_per_metre || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Bending Parallel to Grain (MPa)</label><input name="Bending_Parallel_to_Grain" type="number" value={section.Bending_Parallel_to_Grain || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Tension Parallel to Grain (MPa)</label><input name="Tension_parallel_to_Grain" type="number" value={section.Tension_parallel_to_Grain || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Compression Parallel to Grain (MPa)</label><input name="Compression_parallel_to_Grain" type="number" value={section.Compression_parallel_to_Grain || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Shear Parallel to Grain (MPa)</label><input name="Shear_Parallel_to_Grain" type="number" value={section.Shear_Parallel_to_Grain || ''} onChange={handleChange} className={inputClasses}/></div>
            </div>
          </FormCollapsibleSection>

          <FormCollapsibleSection title="Geometric & Section Properties" color="bg-purple-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClasses}>Depth d (mm)</label><input name="d" type="number" value={section.d || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Width b (mm)</label><input name="b" type="number" value={section.b || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Wall Thickness t (mm)</label><input name="t" type="number" value={section.t || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Web Thickness (mm)</label><input name="web_thickness" type="number" value={section.web_thickness || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Flange Thickness (mm)</label><input name="flange_thickness" type="number" value={section.flange_thickness || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Ix (mm⁴)</label><input name="Ix" type="number" value={section.Ix || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Iy (mm⁴)</label><input name="Iy" type="number" value={section.Iy || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Zx (mm³)</label><input name="Zx" type="number" value={section.Zx || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Zy (mm³)</label><input name="Zy" type="number" value={section.Zy || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>A (mm²)</label><input name="A" type="number" value={section.A || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>J (mm⁴)</label><input name="J" type="number" value={section.J || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Sx (mm³)</label><input name="Sx" type="number" value={section.Sx || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>Sy (mm³)</label><input name="Sy" type="number" value={section.Sy || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>H (mm⁶)</label><input name="H" type="number" value={section.H || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>x (mm³)</label><input name="x" type="number" value={section.x || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>r (mm)</label><input name="r" type="number" value={section.r || ''} onChange={handleChange} className={inputClasses}/></div>
              <div><label className={labelClasses}>d1 (mm)</label><input name="d1" type="number" value={section.d1 || ''} onChange={handleChange} className={inputClasses}/></div>
            </div>
          </FormCollapsibleSection>
        </div>
        
        {/* Fixed buttons at bottom */}
        <div className="flex-shrink-0 bg-white border-t p-4 rounded-b-xl">
          <div className="flex justify-end gap-4">
            {onCancel && <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-gray-200 text-neutral font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>}
            <button type="submit" className="px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-focus transition-colors capitalize">{mode} Section</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StructuralSectionForm;