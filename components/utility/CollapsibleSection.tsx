// components/utility/CollapsibleSection.tsx: A reusable collapsible section component.

import React, { useState } from 'react';
import { ChevronDownIcon } from './icons';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  headerClassName?: string;
  contentClassName?: string;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultCollapsed = true,
  headerClassName = 'bg-gray-100 hover:bg-gray-200',
  contentClassName = 'p-3',
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`border rounded-lg overflow-hidden collapsible-container ${className}`}>
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full flex justify-between items-center p-3 focus:outline-none transition-colors ${headerClassName}`}
      >
        <h4 className="font-semibold text-neutral">{title}</h4>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>
      <div
        className={`border-t collapsible-content ${contentClassName}`}
        style={{ display: isCollapsed ? 'none' : 'block' }}
      >
        {children}
      </div>
    </div>
  );
};

// Reusable Collapsible Section component for internal form use.
export const FormCollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultCollapsed?: boolean; color?: string }> = ({ title, children, defaultCollapsed = false, color = '' }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`w-full flex justify-between items-center p-3 focus:outline-none transition-colors ${isCollapsed && color ? color : 'bg-gray-100 hover:bg-gray-200'}`}
            >
                <h4 className="font-semibold text-neutral">{title}</h4>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
            </button>
            {!isCollapsed && (
                <div className="p-3 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
};

// Summary item interface for FormCollapsibleSectionWithSummary
interface SummaryItem {
    label: string;
    value: string | number | any[]; // Support arrays
    unit?: string;
    arrayDisplayType?: 'count' | 'list' | 'first' | 'last'; // How to display arrays
    arrayProperty?: string; // Which property to extract from array objects
    maxArrayItems?: number; // Max items to show for 'list' type
}

// Enhanced 3-Stage Collapsible Section with Summary
export const FormCollapsibleSectionWithStagedSummary: React.FC<{ 
    title: string; 
    children: React.ReactNode; 
    defaultStage?: 'closed' | 'preview' | 'open';
    color?: string;
    summaryItems?: SummaryItem[];
    enableDoubleClickExpand?: boolean;
}> = ({ 
    title, 
    children, 
    defaultStage = 'closed', 
    color = '', 
    summaryItems = [],
    enableDoubleClickExpand = true
}) => {
    const [stage, setStage] = React.useState<'closed' | 'preview' | 'open'>(defaultStage);
    const [lastClickTime, setLastClickTime] = React.useState(0);

    // Filter valid summary items
    const validItems = summaryItems?.filter(item => {
        if (!item || !item.value) return false;
        if (Array.isArray(item.value)) return item.value.length > 0;
        const stringValue = item.value.toString().trim();
        return stringValue !== '' && stringValue !== 'Not selected';
    }) || [];
    const displayItems = validItems.slice(0, 5); // Show up to 4 items

    // Format array values (same logic as FormCollapsibleSectionWithSummary)
    const formatArrayValue = (item: SummaryItem): string => {
        if (!Array.isArray(item.value)) return item.value.toString();
        const array = item.value;
        const displayType = item.arrayDisplayType || 'count';
        
        switch (displayType) {
            case 'count': return array.length.toString();
            case 'list':
                const maxItems = item.maxArrayItems || 2;
                if (item.arrayProperty) {
                    const values = array.slice(0, maxItems).map(obj => 
                        obj && typeof obj === 'object' ? obj[item.arrayProperty!] : obj
                    ).filter(val => val !== undefined && val !== null);
                    return values.length > 0 ? values.join(', ') : array.length.toString();
                } else {
                    return array.slice(0, maxItems).join(', ');
                }
            case 'first':
                if (array.length === 0) return '0';
                const firstItem = array[0];
                return (item.arrayProperty && firstItem && typeof firstItem === 'object') 
                    ? (firstItem[item.arrayProperty] || firstItem.toString())
                    : firstItem.toString();
            case 'last':
                if (array.length === 0) return '0';
                const lastItem = array[array.length - 1];
                return (item.arrayProperty && lastItem && typeof lastItem === 'object')
                    ? (lastItem[item.arrayProperty] || lastItem.toString())
                    : lastItem.toString();
            default: return array.length.toString();
        }
    };

    // Handle click with double-click detection
    const handleClick = () => {
        const now = Date.now();
        const timeDiff = now - lastClickTime;
        
        if (enableDoubleClickExpand && timeDiff < 300) {
            // Double click - jump directly to open
            setStage('open');
        } else {
            // Single click - cycle through stages
            setStage(current => {
                if (current === 'closed') return 'preview';
                if (current === 'preview') return 'open';
                return 'closed';
            });
        }
        setLastClickTime(now);
    };

    // Get chevron rotation based on stage
    const getChevronRotation = () => {
        switch (stage) {
            case 'closed': return '';
            case 'preview': return 'rotate-90';
            case 'open': return 'rotate-180';
        }
    };

    const getPreviewIndicator = () => {
        if (stage === 'preview') {
            return (
                <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    Preview
                </span>
            );
        }
        return null;
    };

    return (
        <div className={`border rounded-lg overflow-hidden shadow-sm transition-all duration-300 ${color}`}>
            <button
                type="button"
                onClick={handleClick}
                className={`w-full p-4 focus:outline-none transition-all duration-200 ${color}`}
                title={enableDoubleClickExpand ? "Single click: cycle stages | Double click: expand directly" : "Click to cycle through stages"}
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-gray-800 text-base">{title}</h4>
                            {getPreviewIndicator()}
                        </div>
                        
                        {/* Stage 2: Preview - Using chip style like FormCollapsibleSectionWithSummary */}
                        {stage === 'preview' && displayItems.length > 0 && (
                            <div className="mt-2">
                                {/* All items on one line with chip style */}
                                <div className="flex flex-wrap gap-3">
                                    {displayItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-white/70 px-3 py-1 rounded-full border border-gray-200">
                                            <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">{item.label}</span>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {formatArrayValue(item)}{item.unit && ` ${item.unit}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Enhanced chevron with stage indication */}
                    <div className="flex items-center gap-2">
                        <ChevronDownIcon className={`w-5 h-5 transition-all duration-300 flex-shrink-0 text-gray-500 ${getChevronRotation()}`} />
                    </div>
                </div>
            </button>
            
            {/* Stage 3: Open - Full Form */}
            {stage === 'open' && (
                <div className="border-t bg-white">
                    <div className="p-4 space-y-3">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};