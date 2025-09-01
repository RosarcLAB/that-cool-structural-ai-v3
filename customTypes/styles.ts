// customTypes/styles.ts - Centralized button and component styles

export const buttonStyles = {
  // Primary button (teal/green theme)
  primary: `
    background-color: #14b8a6; 
    color: white; 
    padding: 0.5rem 1rem; 
    border-radius: 0.5rem; 
    font-weight: 600; 
    transition: background-color 0.2s;
    border: none;
    cursor: pointer;
  `,
  primaryHover: `background-color: #0d9488;`,

  // Secondary button (gray theme)
  secondary: `
    background-color: #e5e7eb; 
    color: #374151; 
    padding: 0.5rem 1rem; 
    border-radius: 0.5rem; 
    font-weight: 600; 
    transition: background-color 0.2s;
    border: none;
    cursor: pointer;
  `,
  secondaryHover: `background-color: #d1d5db;`,

  // Edit button (blue theme)
  edit: `
    background-color: #3b82f6; 
    color: white; 
    padding: 0.5rem 1rem; 
    border-radius: 0.5rem; 
    font-weight: 600; 
    transition: background-color 0.2s;
    border: none;
    cursor: pointer;
  `,
  editHover: `background-color: #2563eb;`,

  // Duplicate button (light purple theme)
  duplicate: `
    background-color: #a997baff; 
    color: white; 
    padding: 0.5rem 1rem; 
    border-radius: 0.5rem; 
    font-weight: 600; 
    transition: background-color 0.2s;
    border: none;
    cursor: pointer;
  `,
  duplicateHover: `background-color: #89779aff;`,

  // Danger button (red theme)
  danger: `
    background-color: #fee2e2; 
    color: #b91c1c; 
    padding: 0.5rem 1rem; 
    border-radius: 0.5rem; 
    font-weight: 600; 
    transition: background-color 0.2s;
    border: none;
    cursor: pointer;
  `,
  dangerHover: `background-color: #fecaca;`,

  // Disabled states
  secondaryDisabled: `
    background-color: #f3f4f6; 
    color: #9ca3af; 
    cursor: not-allowed;
  `,
  dangerDisabled: `
    background-color: #f3f4f6; 
    color: #9ca3af; 
    cursor: not-allowed;
  `,
  editDisabled: `
    background-color: #f3f4f6; 
    color: #9ca3af; 
    cursor: not-allowed;
  `,
  duplicateDisabled: `
    background-color: #f3f4f6; 
    color: #9ca3af; 
    cursor: not-allowed;
  `,
};

// CSS classes for easy use in components
export const buttonClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  edit: 'btn-edit',
  duplicate: 'btn-duplicate',
  danger: 'btn-danger',
};

// Generate CSS string for style tags
export const generateButtonCSS = () => `
  .btn-primary { ${buttonStyles.primary} }
  .btn-primary:hover { ${buttonStyles.primaryHover} }
  
  .btn-secondary { ${buttonStyles.secondary} }
  .btn-secondary:hover { ${buttonStyles.secondaryHover} }
  .btn-secondary:disabled { ${buttonStyles.secondaryDisabled} }
  
  .btn-edit { ${buttonStyles.edit} }
  .btn-edit:hover { ${buttonStyles.editHover} }
  .btn-edit:disabled { ${buttonStyles.editDisabled} }
  
  .btn-duplicate { ${buttonStyles.duplicate} }
  .btn-duplicate:hover { ${buttonStyles.duplicateHover} }
  .btn-duplicate:disabled { ${buttonStyles.duplicateDisabled} }
  
  .btn-danger { ${buttonStyles.danger} }
  .btn-danger:hover { ${buttonStyles.dangerHover} }
  .btn-danger:disabled { ${buttonStyles.dangerDisabled} }
`;
