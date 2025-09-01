// components/structuralEngineering/BeamAnalysisDisplay.tsx: Renders the results of a beam analysis, including summary data and charts.

import React, { useState, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { BeamOutput, BeamInput } from '../../customTypes/structuralElement';
import { DownloadIcon } from '../utility/icons';
import { Spinner } from '../utility/Spinner';
import { CollapsibleSection } from '../utility/CollapsibleSection';


// Props definition for the BeamAnalysisDisplay component.
interface BeamAnalysisDisplayProps {
  output: BeamOutput;
  input: BeamInput;
}

export interface BeamAnalysisDisplayHandle {
  downloadPdf: () => void;
  downloadCsv: () => void;
}

// Helper function to format numbers for display, using exponential notation for very large/small values.
const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return 'N/A';
  if (Math.abs(num) > 1e4 || (Math.abs(num) < 1e-2 && num !== 0)) {
    return num.toExponential(2);
  }
  return num.toFixed(2);
};

export const BeamAnalysisDisplay = forwardRef<BeamAnalysisDisplayHandle, BeamAnalysisDisplayProps>(({ output, input }, ref) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const reportId = useMemo(() => `report-${crypto.randomUUID()}`, []);
  
  // Prepares the data in a format suitable for the Recharts library.
  const chartData = output.x_values.map((x, i) => ({
    x: x,
    bending_moment: -output.bending_moment[i] / 1000, // Convert to kNm for display and invert sign
    shear_force: output.shear_force[i] / 1000, // Convert to kN for display
    deflection: output.deflection[i] * 1000, // Convert to mm for display
  }));

  // Handles the downloading of analysis results as a CSV file.
  const handleDownloadCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Summary\n";
    csvContent += "Metric,Value,Unit,Position (m)\n";
    csvContent += `Max Bending Moment,${-output.max_bending[1] / 1000},kNm,${output.max_bending[0]}\n`;
    csvContent += `Max Shear Force,${output.max_shear[1] / 1000},kN,${output.max_shear[0]}\n`;
    csvContent += `Max Deflection,${output.max_deflection[1] * 1000},mm,${output.max_deflection[0]}\n\n`;
    csvContent += "Reactions\n";
    csvContent += "Position (m),Fx (kN),Fy (kN),Mz (kNm)\n";
    Object.entries(output.reactions).forEach(([pos, vals]) => {
        csvContent += `${pos},${vals[0] / 1000},${vals[1] / 1000},${vals[2] / 1000}\n`;
    });
    csvContent += "\n";
    csvContent += "Detailed Diagram Data\n";
    csvContent += "Position (m),Shear Force (kN),Bending Moment (kNm),Deflection (mm)\n";
    chartData.forEach((data) => {
        const row = [data.x, data.shear_force, data.bending_moment, data.deflection].join(',');
        csvContent += row + '\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${input.Name.replace(/\s+/g, '_')}_analysis.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
   // Handles downloading the results as a structured two-page A4 PDF.
  const handleDownloadPdf = async () => {
    const page1Element = document.getElementById(`${reportId}-page-1`);
    const page2Element = document.getElementById(`${reportId}-page-2`);
    if (!page1Element || !page2Element) return;

    setIsDownloadingPdf(true);
    
    // Create a temporary stylesheet to force-open all sections for printing
    const style = document.createElement('style');
    style.innerHTML = `
        #${reportId} .collapsible-content {
            display: block !important;
        }
    `;
    document.head.appendChild(style);

    // Helper function to introduce a delay for rendering.
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        // Wait a moment for the DOM to update with the new styles and for charts to render
        await sleep(500); 

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageMargin = pdfWidth * 0.075; 
        const contentWidth = pdfWidth - (pageMargin * 2);

        const canvasOptions = {
            scale: 2, // Improve resolution
        };

        // --- Process Page 1 ---
        const canvas1 = await html2canvas(page1Element, canvasOptions);
        const imgData1 = canvas1.toDataURL('image/png');
        const imgHeight1 = (canvas1.height * contentWidth) / canvas1.width;
        pdf.addImage(imgData1, 'PNG', pageMargin, pageMargin, contentWidth, imgHeight1);

        // --- Process Page 2 ---
        pdf.addPage();
        const canvas2 = await html2canvas(page2Element, canvasOptions);
        const imgData2 = canvas2.toDataURL('image/png');
        const imgHeight2 = (canvas2.height * contentWidth) / canvas2.width;
        pdf.addImage(imgData2, 'PNG', pageMargin, pageMargin, contentWidth, imgHeight2);

        pdf.save(`${input.Name.replace(/\s+/g, '_')}_report.pdf`);

    } catch (error) {
        console.error("Failed to generate PDF:", error);
    } finally {
        // IMPORTANT: Clean up the injected stylesheet
        document.head.removeChild(style);
        setIsDownloadingPdf(false);
    }
  };

  // Expose download functions to parent component
  useImperativeHandle(ref, () => ({
      downloadPdf: handleDownloadPdf,
      downloadCsv: handleDownloadCsv,
  }));
  
  // A reusable function to render a single line chart for a specific data key (e.g., bending moment).
  // Animations are disabled to ensure correct rendering with html2canvas.
  const renderChart = (dataKey: keyof typeof chartData[0], name: string, unit: string, color: string) => (
    <div className="h-56 mt-4">
      <ResponsiveContainer width="99%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" />
          <YAxis
            tickFormatter={formatNumber}
            label={{ value: `${name} (${unit})`, angle: -90, position: 'insideLeft', offset: 0 }}
          />
          <Tooltip
            formatter={(value: number) => [formatNumber(value), name]}
            labelFormatter={(label: number) => `Position: ${formatNumber(label)} m`}
          />
          <Legend />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
          <Area isAnimationActive={false} type="monotone" dataKey={dataKey} name={name} stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  // Main render method for the component.
  return (
    <div ref={printRef} id={reportId}>
      <div className="p-4 bg-white rounded-lg space-y-4">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-xl font-bold text-neutral"> {input.Name}</h3>
              <div className="flex items-center gap-2">
                  <button onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50">
                      {isDownloadingPdf ? <Spinner/> : <DownloadIcon className="w-4 h-4" />}
                      Download PDF
                  </button>
                  <button onClick={handleDownloadCsv} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-teal-50 hover:bg-teal-100 rounded-full transition-colors">
                      <DownloadIcon className="w-4 h-4" />
                      Download CSV
                  </button>
              </div>
          </div>
        
        {/* Page 1 Content for PDF */}
        <div id={`${reportId}-page-1`}>
            {/* Input Summary Section */}
            <CollapsibleSection 
                title="Beam: Input Parameters" 
                headerClassName="bg-teal-50 hover:bg-teal-100"
                contentClassName="p-4"
                defaultCollapsed={false}
                className="mb-4"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div><p className="text-sm text-gray-500">Span</p><p className="font-semibold">{formatNumber(input.Span)} m</p></div>
                        <div><p className="text-sm text-gray-500">Section Name</p><p className="font-semibold">{input.sectionName || 'N/A'}</p></div>
                        <div><p className="text-sm text-gray-500">Young's Modulus (E)</p><p className="font-semibold">{formatNumber(input.E)} GPa</p></div>
                        <div><p className="text-sm text-gray-500">Moment of Inertia (I)</p><p className="font-semibold">{formatNumber(input.I)} m⁴</p></div>
                        <div><p className="text-sm text-gray-500">Area (A)</p><p className="font-semibold">{formatNumber(input.A)} m²</p></div>
                    </div>
                     <div>
                        <h5 className="font-semibold mt-4 mb-2 text-sm text-gray-700">Supports</h5>
                        <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-2">Position (m)</th><th className="p-2">Fixity</th></tr></thead><tbody>{input.Supports.map((s, i) => (<tr key={i} className="border-b"><td className="p-2">{formatNumber(s.position)}</td><td className="p-2">{s.fixity}</td></tr>))}</tbody></table>
                    </div>
                    <div>
                        <h5 className="font-semibold mt-4 mb-2 text-sm text-gray-700">Loads</h5>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Type</th>
                                    <th className="p-2">Magnitude(s)</th>
                                    <th className="p-2">Position(s) (m)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {input.Loads.map((l, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2">{l.name}</td>
                                        <td className="p-2">{l.type}</td>
                                        <td className="p-2">{l.magnitude.map(m => formatNumber(m / 1000)).join(' / ')}</td>
                                        <td className="p-2">{l.position.join(' to ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CollapsibleSection>
            
            {/* Results Sections */}
            <div className="pt-4 mt-4 border-t">
                 <div className="mb-4"><h3 className="text-lg font-bold text-neutral">Analysis Results</h3></div>
            </div>


            <CollapsibleSection 
                title="Summary: Maximum Values"
                headerClassName="bg-teal-50 hover:bg-teal-100"
                contentClassName="p-4"
                className="mb-4"
                defaultCollapsed={false}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div><p className="text-sm text-gray-500">Max Bending Moment</p><p className="text-lg font-semibold">{formatNumber(-output.max_bending[1]/1000)} kNm</p><p className="text-xs text-gray-400">at {formatNumber(output.max_bending[0])} m</p></div>
                <div><p className="text-sm text-gray-500">Max Shear Force</p><p className="text-lg font-semibold">{formatNumber(output.max_shear[1]/1000)} kN</p><p className="text-xs text-gray-400">at {formatNumber(output.max_shear[0])} m</p></div>
                <div><p className="text-sm text-gray-500">Max Deflection</p><p className="text-lg font-semibold">{formatNumber(output.max_deflection[1]*1000)} mm</p><p className="text-xs text-gray-400">at {formatNumber(output.max_deflection[0])} m</p></div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
                title="Reactions"
                headerClassName="bg-teal-50 hover:bg-teal-100"
                contentClassName="p-4"
                className="mb-4"
                defaultCollapsed={false}
            >
              <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-2">Position (m)</th><th className="p-2">Fx (kN)</th><th className="p-2">Fy (kN)</th><th className="p-2">Mz (kNm)</th></tr></thead><tbody>{Object.entries(output.reactions).map(([pos, vals]) => (<tr key={pos} className="border-b"><td className="p-2">{formatNumber(Number(pos))}</td><td className="p-2">{formatNumber(vals[0]/1000)}</td><td className="p-2">{formatNumber(vals[1]/1000)}</td><td className="p-2">{formatNumber(vals[2]/1000)}</td></tr>))}</tbody></table>
            </CollapsibleSection>
        </div>
        
        {/* Page 2 Content for PDF */}
        <div id={`${reportId}-page-2`}>
            <CollapsibleSection 
                title="Shear Force Diagram"
                headerClassName="bg-teal-50 hover:bg-teal-100"
                contentClassName="p-4"
                className="mb-4"
            >
              {renderChart('shear_force', 'Shear Force', 'kN', '#ef4444')}
            </CollapsibleSection>

            <CollapsibleSection
                title="Bending Moment Diagram"
                headerClassName="bg-teal-50 hover:bg-teal-100"
                contentClassName="p-4"
                className="mb-4"
            >
              {renderChart('bending_moment', 'Bending Moment', 'kNm', '#3b82f6')}
            </CollapsibleSection>
            
            <CollapsibleSection
                title="Deflection Diagram"
                headerClassName="bg-teal-50 hover:bg-teal-100"
                contentClassName="p-4"
                className="mb-4"
            >
              {renderChart('deflection', 'Deflection', 'mm', '#14b8a6')}
            </CollapsibleSection>
        </div>
      </div>
    </div>
  );
});