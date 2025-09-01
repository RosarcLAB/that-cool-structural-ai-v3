// components/LoadingForm.tsx: A form for users to define reusable load types.

import React, { useState } from 'react';
import { LoadingFormInput, LoadingCategory, LoadUnit } from '../customTypes/types';

interface LoadingFormProps {
  initialData: LoadingFormInput;
  onSubmit: (data: LoadingFormInput) => void;
  onCancel: () => void;
  isFormActive: boolean;
}

export const LoadingForm: React.FC<LoadingFormProps> = ({ initialData, onSubmit, onCancel, isFormActive }) => {
  const [data, setData] = useState<LoadingFormInput>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: name === 'magnitude' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };
  
  if (!isFormActive) {
     return (
        <div className="p-3 text-sm italic text-gray-500 text-center border rounded-lg bg-gray-50">
            <p className="font-semibold">{data.name}</p>
            <p>({data.magnitude} {data.unit})</p>
            <p className="mt-1">Saved.</p>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-xl shadow-sm bg-base-100">
        <h3 className="text-lg font-bold text-center text-neutral">Load Definition</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Load Name</label>
                <input type="text" name="name" value={data.name} onChange={handleChange} placeholder="e.g., Office Live Load" className="input" />
            </div>
            <div>
                <label className="text-xs font-medium text-gray-600">Category</label>
                <select name="category" value={data.category} onChange={handleChange} className="input">
                    {Object.values(LoadingCategory).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-gray-600">Magnitude</label>
                <input type="number" step="any" name="magnitude" value={data.magnitude} onChange={handleChange} className="input" />
            </div>
            <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Unit</label>
                 <select name="unit" value={data.unit} onChange={handleChange} className="input">
                    {Object.values(LoadUnit).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
        </div>

        <div className="flex justify-end gap-4">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Load</button>
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