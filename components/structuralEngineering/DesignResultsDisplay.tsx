// components/Engineering/DesignResultsDisplay.tsx
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FormCollapsibleSection, FormCollapsibleSectionWithStagedSummary } from '../utility/CollapsibleSection';
import {DesignOutput} from '../../customTypes/structuralElement';

// Define the design output interface based on the API response structure


interface DesignResultsDisplayProps {
  results: DesignOutput[];
  isVisible?: boolean;
}

const formatNumber = (num: any, decimals: number = 2): string => {
  try {
    // Handle undefined, null, or empty string
    if (num === undefined || num === null || num === '') {
      return 'N/A';
    }

    // Convert to number, handling various input types
    let numValue: number;
    
    if (typeof num === 'number') {
      numValue = num;
    } else if (typeof num === 'string') {
      numValue = parseFloat(num.toString());
    } else if (typeof num === 'boolean') {
      numValue = num ? 1 : 0;
    } else {
      // Try to convert other types to number
      numValue = Number(num);
    }
    
    // Final check - if still not a valid number, return N/A
    if (!Number.isFinite(numValue)) {
      return 'N/A';
    }
    
    // Format the number
    if (Math.abs(numValue) > 1e4 || (Math.abs(numValue) < 1e-2 && numValue !== 0)) {
      return numValue.toExponential(decimals);
    }
    return numValue.toFixed(decimals);
  } catch (error) {
    console.error('formatNumber error:', error, 'input:', num);
    return 'N/A';
  }
};

// Helper function to safely access array values
const safeArrayValue = (arr: any, index: number, defaultValue: any = 0): any => {
  if (!Array.isArray(arr) || arr.length <= index || arr[index] === undefined || arr[index] === null) {
    return defaultValue;
  }
  return arr[index];
};

// Helper function to safely access nested object properties
const safeGet = (obj: any, path: string, defaultValue: any = 0): any => {
  return path.split('.').reduce((current, key) => {
    return (current && current[key] !== undefined) ? current[key] : defaultValue;
  }, obj);
};

const getStatusColorClasses = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PASS':
      return 'bg-green-100 text-green-800';
    case 'FAIL':
      return 'bg-red-50 text-red-700'; // Light red instead of dark red
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// A reusable React component to render a single line chart for a specific data key (e.g., bending moment).
interface ChartComponentProps {
  result: DesignOutput;
  dataKey: 'bending_moment' | 'shear_force' | 'deflection';
  name: string;
  unit: string;
  color: string;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ result, dataKey, name, unit, color }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    // Delay chart rendering to ensure container is visible
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Check if we have the required data for charts
  if (!result.x_values || !result[dataKey] || result.x_values.length === 0 || result[dataKey].length === 0) {
    return (
      <div style={{ height: '256px', width: '100%', marginTop: '16px', minHeight: '256px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Chart data not available</p>
      </div>
    );
  }

  // Prepare chart data from the result
  const chartData = result.x_values.map((x, i) => ({
    x: x,
    bending_moment: result.bending_moment[i] / 1000, // Convert to kNm for display
    shear_force: result.shear_force[i] / 1000, // Convert to kN for display
    deflection: result.deflection[i] * 1000 * -1, // Convert to mm for display and make negative
  }));

  if (!isVisible) {
    return (
      <div style={{ height: '256px', width: '100%', marginTop: '16px', minHeight: '256px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading chart...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '256px', width: '100%', marginTop: '16px', minHeight: '256px' }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            label={{ value: 'Position (m)', position: 'insideBottom', offset: -5 }}
            tickFormatter={(x) => formatNumber(x, 3)}
          />
          <YAxis
            tickFormatter={(value) => formatNumber(value)}
            label={{ value: `${name} (${unit})`, angle: -90, position: 'insideLeft', offset: 0 }}
          />
          <Tooltip
            formatter={(value: number) => [formatNumber(value), name]}
            labelFormatter={(label: number) => `Position: ${formatNumber(label, 2)} m`}
          />
          <Legend />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
          <Area type="monotone" dataKey={dataKey} name={name} stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DesignResultsDisplay: React.FC<DesignResultsDisplayProps> = ({ results, isVisible = true }) => {
  if (!isVisible || !results || results.length === 0) {
    return null;
  }

  // Aggregate overall status and max metrics for preview summary
  const overallStatus = results.every(r => (r?.capacity_data?.status || '').toString().toUpperCase() === 'PASS') ? 'PASS' : 'FAIL';
  const maxBending = results.reduce((max, r) => Math.max(max, Math.abs(safeArrayValue(r.max_bending, 1) || 0)), 0);
  const maxShear = results.reduce((max, r) => Math.max(max, Math.abs(safeArrayValue(r.max_shear, 1) || 0)), 0);
  const maxDeflection = results.reduce((max, r) => Math.max(max, Math.abs(safeArrayValue(r.max_deflection, 1) || 0)), 0);

  const summaryItems = [
    { label: 'Status', value: overallStatus },
    { label: 'Max Bending', value: `${formatNumber(maxBending / 1000, 2)} kNm` },
    { label: 'Max Shear', value: `${formatNumber(maxShear / 1000, 2)} kN` },
    { label: 'Max Deflection', value: `${formatNumber(maxDeflection * 1000, 2)} mm` }
  ];

  return (
    <FormCollapsibleSectionWithStagedSummary title="Element Output Data" color="bg-teal-50/50" defaultStage="preview" summaryItems={summaryItems}>
      <div className="flex flex-col gap-2">
        {results.map((result, index) => (
            <FormCollapsibleSectionWithStagedSummary
            key={index}
            title={result.combinationName || `Load Combination ${index + 1}`}
            defaultStage="preview"
            enableDoubleClickExpand={true}
            color="bg-teal-100/50"
            summaryItems={[
              { label: 'Status', value: result.capacity_data.status },
              { label: 'Bending', value: `${formatNumber(safeGet(result, 'capacity_data.utilization.bending_strength', 0) * 100, 1)}%` },
              { label: 'Shear', value: `${formatNumber(safeGet(result, 'capacity_data.utilization.shear_strength', 0) * 100, 1)}%` },
              { label: 'Max Def.', value: `${formatNumber(safeArrayValue(result.max_deflection, 1) * 1000 * -1, 2)} mm @ ${formatNumber(safeArrayValue(result.max_deflection, 0))} m` },
              { label: 'Reactions', value: `${Object.entries(result.reactions).map(([key, val]) => ` @ ${key}m: ${formatNumber(val[1]/1000, 1)} kN`).join(', ')}` }

            ]}
            >
            <div className="mb-2 shadow-md border rounded-lg">
            <div className="p-4">
              {/* Header with combination name and status */}
              <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold">
                {result.combinationName || `Load Combination ${index + 1}`}
              </h3>
              <span 
                className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColorClasses(result.capacity_data.status)}`}
              >
                {result.capacity_data.status}
              </span>
              </div>

              {/* Design Summary Section */}
              <FormCollapsibleSection title="Design Summary" color="bg-blue-50/30" defaultCollapsed={false}>
                <FormCollapsibleSection title="Summary: Maximum Values" color="bg-yellow-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div><p className="text-sm text-gray-800">Max Bending Moment</p><p className="text-lg font-semibold">{formatNumber(safeArrayValue(result.max_bending, 1) / 1000)} kNm</p><p className="text-xs text-gray-800">at {formatNumber(safeArrayValue(result.max_bending, 0))} m</p></div>
                  <div><p className="text-sm text-gray-800">Max Shear Force</p><p className="text-lg font-semibold">{formatNumber(safeArrayValue(result.max_shear, 1) / 1000)} kN</p><p className="text-xs text-gray-800">at {formatNumber(safeArrayValue(result.max_shear, 0))} m</p></div>
                  <div><p className="text-sm text-gray-800">Max Deflection</p><p className="text-lg font-semibold">{formatNumber(safeArrayValue(result.max_deflection, 1) * 1000 * -1)} mm</p><p className="text-xs text-gray-800">at {formatNumber(safeArrayValue(result.max_deflection, 0))} m</p></div>
                </div>
                </FormCollapsibleSection>
                <FormCollapsibleSection title="Summary: Capacity & Utilization" color="bg-blue-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                  <p className="text-sm text-gray-800">Bending Capacity</p>
                  <p className="text-lg font-semibold">{formatNumber(result.bending_capacity)} kNm</p>
                  <p className="text-xs text-gray-800">Utilization: {formatNumber(safeGet(result, 'capacity_data.utilization.bending_strength', 0) * 100, 1)}%</p>
                  {safeGet(result, 'capacity_data.capacities.phi') && (
                    <p className="text-xs text-gray-800">φ: {formatNumber(safeGet(result, 'capacity_data.capacities.phi'))}</p>
                  )}
                  </div>
                  <div>
                  <p className="text-sm text-gray-800">Shear Capacity</p>
                  <p className="text-lg font-semibold">{formatNumber(result.shear_capacity)} kN</p>
                  <p className="text-xs text-gray-800">Utilization: {formatNumber(safeGet(result, 'capacity_data.utilization.shear_strength', 0) * 100, 1)}%</p>
                  </div>
                  <div>
                  <p className="text-sm text-gray-800">Deflection Check</p>
                  <p className="text-lg font-semibold">{formatNumber(safeArrayValue(result.max_deflection, 1) * 1000 * -1, 2)} mm</p>
                  <p className="text-xs text-gray-800">at {formatNumber(safeArrayValue(result.max_deflection, 0))} m</p>
                  </div>
                </div>
                </FormCollapsibleSection>
               </FormCollapsibleSection>

              <hr className="my-4" />

              {/* Detailed Capacities */}
              <FormCollapsibleSection title="Detailed Capacities" color="bg-green-50/30" defaultCollapsed={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <p className="font-semibold mb-1">
                  <strong>Material Properties</strong>
                </p>
                {safeGet(result, 'capacity_data.capacities.fb') && (
                  <p className="text-sm">
                  fb: {formatNumber(safeGet(result, 'capacity_data.capacities.fb'))} MPa
                  </p>
                )}
                {safeGet(result, 'capacity_data.capacities.fs') && (
                  <p className="text-sm">
                  fs: {formatNumber(safeGet(result, 'capacity_data.capacities.fs'))} MPa
                  </p>
                )}
                {safeGet(result, 'capacity_data.capacities.Z') && (
                  <p className="text-sm">
                  Section Modulus (Z): {formatNumber(safeGet(result, 'capacity_data.capacities.Z'))} mm³
                  </p>
                )}
                </div>
                <div>
                <p className="font-semibold mb-1">
                  <strong>Modification Factors</strong>
                </p>
                {safeGet(result, 'capacity_data.capacities.k1_factor') && (
                  <p className="text-sm">
                  k1 factor: {formatNumber(safeGet(result, 'capacity_data.capacities.k1_factor'))}
                  </p>
                )}
                {safeGet(result, 'capacity_data.capacities.k2_factor') && (
                  <p className="text-sm">
                  k2 factor: {formatNumber(safeGet(result, 'capacity_data.capacities.k2_factor'))}
                  </p>
                )}
                {safeGet(result, 'capacity_data.capacities.k3_factor') && (
                  <p className="text-sm">
                  k3 factor: {formatNumber(safeGet(result, 'capacity_data.capacities.k3_factor'))}
                  </p>
                )}
                {safeGet(result, 'capacity_data.capacities.k4_factor') && (
                  <p className="text-sm">
                  k4 factor: {formatNumber(safeGet(result, 'capacity_data.capacities.k4_factor'))}
                  </p>
                )}
                {safeGet(result, 'capacity_data.capacities.k5_factor') && (
                  <p className="text-sm">
                  k5 factor: {formatNumber(safeGet(result, 'capacity_data.capacities.k5_factor'))}
                  </p>
                )}
                {result.capacity_data.capacities.k6_factor && (
                  <p className="text-sm">
                  k6 factor: {formatNumber(result.capacity_data.capacities.k6_factor)}
                  </p>
                )}
                {result.capacity_data.capacities.k7_factor && (
                  <p className="text-sm">
                  k7 factor: {formatNumber(result.capacity_data.capacities.k7_factor)}
                  </p>
                )}
                {result.capacity_data.capacities.k8_factor && (
                  <p className="text-sm">
                  k8 factor: {formatNumber(result.capacity_data.capacities.k8_factor)}
                  </p>
                )}
                {result.capacity_data.capacities.k9_factor && (
                  <p className="text-sm">
                  k9 factor: {formatNumber(result.capacity_data.capacities.k9_factor)}
                  </p>
                )}
                {result.capacity_data.capacities.k12_factor && (
                  <p className="text-sm">
                  k12 factor: {formatNumber(result.capacity_data.capacities.k12_factor)}
                  </p>
                )}
                </div>
              </div>
              </FormCollapsibleSection>

              <hr className="my-4" />


              {/* Reactions */}
              <FormCollapsibleSection title="Support Reactions" color="bg-purple-50/30" defaultCollapsed={false}>
               
                <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                  <th className="p-2">Position (m)</th>
                  <th className="p-2">Fx (kN)</th>
                  <th className="p-2">Fy (kN)</th>
                  <th className="p-2">Mz (kNm)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.reactions)
                  .reverse()
                  .map(([pos, vals]) => (
                  <tr key={pos} className="border-b">
                    <td className="p-2">{formatNumber(Number(pos))}</td>
                    <td className="p-2">{formatNumber(vals[0]/1000)}</td>
                    <td className="p-2">{formatNumber(vals[1]/1000)}</td>
                    <td className="p-2">{formatNumber(vals[2]/1000)}</td>
                  </tr>
                  ))}
                </tbody>
                </table>
              
              </FormCollapsibleSection>


              <hr className="my-4" />


              {/* Analysis Charts */}
              <FormCollapsibleSectionWithStagedSummary
              title="Analysis Charts"
              defaultStage="closed"
              enableDoubleClickExpand={true}
              color="bg-indigo-50/50"
              summaryItems={[
                { label: 'Max Moment', value: `${formatNumber(safeArrayValue(result.max_bending, 1) / 1000, 2)} kNm @ ${formatNumber(safeArrayValue(result.max_bending, 0))} m` },
                { label: 'Max Shear', value: `${formatNumber(safeArrayValue(result.max_shear, 1) / 1000, 2)} kN @ ${formatNumber(safeArrayValue(result.max_shear, 0))} m` },
                { label: 'Max Defl.', value: `${formatNumber(safeArrayValue(result.max_deflection, 1) * 1000 * -1, 2)} mm @ ${formatNumber(safeArrayValue(result.max_deflection, 0))} m` },
              ]}
              >
              <div className="space-y-6">
                {/* Shear Force Chart */}
                <div>
                <h6 className="mb-3 text-red-700 font-semibold text-lg">
                  Shear Force Diagram
                </h6>
                <ChartComponent 
                  result={result} 
                  dataKey="shear_force" 
                  name="Shear Force" 
                  unit="kN" 
                  color="#ef4444" 
                />
                </div>

                {/* Bending Moment Chart */}
                <div>
                <h6 className="mb-3 text-blue-700 font-semibold text-lg">
                  Bending Moment Diagram
                </h6>
                <ChartComponent 
                  result={result} 
                  dataKey="bending_moment" 
                  name="Bending Moment" 
                  unit="kNm" 
                  color="#3b82f6" 
                />
                </div>

                {/* Deflection Chart */}
                <div>
                <h6 className="mb-3 text-teal-700 font-semibold text-lg">
                  Deflection Diagram
                </h6>
                <ChartComponent 
                  result={result} 
                  dataKey="deflection" 
                  name="Deflection" 
                  unit="mm" 
                  color="#14b8a6" 
                />
                </div>
              </div>
              </FormCollapsibleSectionWithStagedSummary>
            </div>
            </div>
            </FormCollapsibleSectionWithStagedSummary>
        ))}
      </div>
  </FormCollapsibleSectionWithStagedSummary>
  );
};

export default DesignResultsDisplay;
