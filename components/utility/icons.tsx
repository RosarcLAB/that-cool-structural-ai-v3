// components/utility/icons.tsx: A collection of simple SVG icon components used throughout the application.

import React from 'react';

export const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

export const AddIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" {...props}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
  </svg>
);

export const RemoveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" {...props}>
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-4.28 9a.75.75 0 01.75-.75h7.06a.75.75 0 010 1.5H8.47a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
);

export const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
    </svg>
);

// Alternative professional chat icons - uncomment to use any of these:

// Option 2: Modern bubble style (similar to modern messaging apps)
// export const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
//         <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
//         <circle cx="9" cy="12" r="1" fill="white" />
//         <circle cx="12" cy="12" r="1" fill="white" />
//         <circle cx="15" cy="12" r="1" fill="white" />
//     </svg>
// );

// Option 3: Professional conversation icon
// export const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
//         <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h11c.55 0 1-.45 1-1z" />
//     </svg>
// );

// Option 4: Clean Material Design chat bubbles
// export const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
//         <path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H6l-4 4V6c0-1.1.9-2 2-2z" />
//         <path d="M8 14h8v-2H8v2zm0-3h8V9H8v2zm0-3h8V6H8v2z" fill="white" />
//     </svg>
// );

export const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

export const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
);

export const DocumentMagnifyingGlassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-5.25a.75.75 0 011.5 0v5.25a4.5 4.5 0 01-4.5 4.5H4.5a4.5 4.5 0 01-4.5-4.5v-9a4.5 4.5 0 014.5-4.5H9a.75.75 0 010 1.5H4.5z" />
        <path d="M18.75 3.75a.75.75 0 00-1.5 0v1.5h-1.5a.75.75 0 000 1.5h1.5v1.5a.75.75 0 001.5 0v-1.5h1.5a.75.75 0 000-1.5h-1.5v-1.5z" />
        <path fillRule="evenodd" d="M10.5 11.25a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm5.25-6.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5z" clipRule="evenodd" />
        <path d="M14.06 15.44a.75.75 0 011.06 0l3 3a.75.75 0 11-1.06 1.06l-3-3a.75.75 0 010-1.06z" />
    </svg>
);

export const PanelRightOpenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
  </svg>
);

export const PanelLeftCloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 4.5l-7.5 7.5 7.5 7.5m6-15L12 12l7.5 7.5" />
    </svg>
);

export const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export const ChatBubbleLeftRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72.241c-.56.035-.992.476-.992.942v.714a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25V6.75a2.25 2.25 0 012.25-2.25h.75a2.25 2.25 0 012.25 2.25v.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h.75a2.25 2.25 0 012.25 2.25v.75a2.25 2.25 0 01-2.25 2.25h-.75m0-4.5h.75a2.25 2.25 0 002.25-2.25v-.75a2.25 2.25 0 00-2.25-2.25h-.75m15 6.375c0 .621-.504 1.125-1.125 1.125H15a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h1.5a1.125 1.125 0 011.125 1.125v1.5z" />
    </svg>
);

export const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 18.75a3.75 3.75 0 003.75-3.75V6.75a3.75 3.75 0 00-7.5 0v8.25A3.75 3.75 0 0012 18.75zM10.5 6.75a1.5 1.5 0 013 0v8.25a1.5 1.5 0 01-3 0V6.75z" />
    <path d="M4.5 11.25a.75.75 0 000 1.5v.75c0 3.53 2.61 6.43 6 6.92V22.5a.75.75 0 001.5 0v-2.08c3.39-.49 6-3.39 6-6.92v-.75a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5v.75a6.001 6.001 0 01-10.5 3.109A5.996 5.996 0 016 13.5v-.75a.75.75 0 000-1.5h-.75z" />
  </svg>
);

export const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
  </svg>
);

export const BuildingBlockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M4.5 3.75a.75.75 0 01.75-.75h13.5a.75.75 0 01.75.75v16.5a.75.75 0 01-.75.75h-13.5a.75.75 0 01-.75-.75V3.75zM8.25 4.5a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5zM8.25 9a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5zM8.25 13.5a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
    </svg>
);

export const ListBulletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
);

export const FolderIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

export const PinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.707 2.293a1 1 0 00-1.414 0L9 4.586 5.707 7.879a1 1 0 00-.293.707V11a1 1 0 00.293.707l6 6a1 1 0 001.414 0l2.293-2.293L21 13.414a1 1 0 000-1.414l-8.293-8.293zM7.5 9.914L9 8.414 14.586 14 13.086 15.5 7.5 9.914z" />
  </svg>
);
// Shared custom SVG icons
export const ArrowBackIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);
export const DoubleArrowIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <polyline points="6 9 3 12 6 15" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="18 9 21 12 18 15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const SpanDimensionIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
    <polyline points="4 12 1 15 4 18" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="1" y1="15" x2="23" y2="15" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="20 12 23 15 20 18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const MoreVertIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);
export const BookmarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
  </svg>
);
export const DeleteIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);
export const ShareIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 0-2.186m0 2.186c-.18.324-.283.696-.283 1.093s.103.77.283 1.093m0-2.186Zm-9.566-5.314a2.25 2.25 0 1 0 0-2.186m0 2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186Z" />
  </svg>
);
export const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);
export const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v1.5a2.25 2.25 0 0 1-2.25 2.25h-6a2.25 2.25 0 0 1-2.25-2.25v-6a2.25 2.25 0 0 1 2.25-2.25h1.5m4.5 0v-1.5a2.25 2.25 0 0 1 2.25-2.25h6a2.25 2.25 0 0 1 2.25 2.25v6a2.25 2.25 0 0 1-2.25 2.25h-1.5" />
  </svg>
);
