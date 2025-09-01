// components/TributaryForm.tsx: A form for users to define tributary areas.

import React, { useState } from 'react';
import { TributaryFormInput, TributaryType } from '../customTypes/types';

interface TributaryFormProps {
  initialData: TributaryFormInput;
  onSubmit: (data: TributaryFormInput) => void;
  onCancel: () => void;
  isFormActive: boolean;
}

export const TributaryForm: React.FC<TributaryFormProps> = ({ initialData, onSubmit, onCancel, isFormActive }) => {
  const [data, setData] = useState<TributaryFormInput>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: name === 'dimension1' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };
  
  const dimensionLabel = data.type === TributaryType.Wall ? 'Height (m)' : 'Tributary Width (m)';

  if (!isFormActive) {
     return (
        <div className="p-3 text-sm italic text-gray-500 text-center border rounded-lg bg-gray-50">
            <p className="font-semibold">{data.name}</p>
            <p>({data.type}, {data.dimension1}m)</p>
            <p className="mt-1">Saved.</p>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-xl shadow-sm bg-base-100">
        <h3 className="text-lg font-bold text-center text-neutral">Tributary Definition</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Tributary Name</label>
                <input type="text" name="name" value={data.name} onChange={handleChange} placeholder="e.g., Interior Partition Wall" className="input" />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-600">Type</label>
                <select name="type" value={data.type} onChange={handleChange} className="input">
                    {Object.values(TributaryType).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-gray-600">{dimensionLabel}</label>
                <input type="number" step="any" name="dimension1" value={data.dimension1} onChange={handleChange} className="input" />
            </div>
        </div>

        <div className="flex justify-end gap-4">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Tributary</button>
        </div>
        <style>{`
            .input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; width: 100%; transition: ring 0.2s; background-color: white; }
            .input:focus { outline: none; ring: 2px; border-color: #14b8a6; }
            .btn-primary { background-color: #14b8a6; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.2s; }
            .btn-primary:hover { background-color: #0d9488; }
            .btn-secondary { background-color: #e5e7eb; color: #374151; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.2s; }
            .btn-secondary:hover { background-color: #d1d5db; }
        `}</style>
    </form>
  );
};