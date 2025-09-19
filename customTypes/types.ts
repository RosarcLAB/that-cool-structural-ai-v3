// types.ts: Defines the core data structures and type definitions for the application.
import type { BeamInput, BeamOutput, Element } from './structuralElement';
import type { Timestamp, FieldValue } from 'firebase/firestore';

// Defines the sender of a chat message.
export type ChatMessageSender = 'user' | 'ai';
// Defines the type of content within a chat message.
export type ChatMessageType = 'text' | 'beam_input_form' | 'beam_output_display' | 'element_form' | 'error';

// Represents a single message in the chat history.
export interface ChatMessage {
  id: string;
  /** The sender of the message, either the 'user' or the 'ai'. */
  sender: ChatMessageSender;
  text: string;
  type: ChatMessageType;
  beamInputsData?: BeamInput[];
  beamOutputData?: BeamOutput;
  /** An array of booleans indicating whether the corresponding form at each index is active and can be submitted. */
  isFormActive?: boolean[];
  actions?: Action[];
  actionsConsumed?: boolean;
  /** A flag to indicate if the canvas should be displayed alongside this message. */
  showCanvas?: boolean;
   /** Optional array of element data, used when the message type is 'element_form'. */
    elementData?: Element[] | null;
   timestamp?:   Date | string; // Use Timestamp for Firestore compatibility
   /** Status message specific to this message/form */
   statusMessage?: StatusMessage | null;
}

// Represents a file payload to be sent to the Gemini API.
export interface FilePayload {
  mimeType: string;
  data: string; // Base64 encoded string
}

// A discriminated union for actions the AI can request.
export type FormAction = {
    type: 'submit' | 'cancel'| 'open_BeamInputForm' | 'open_ElementForm';
    targetIndex: number; // 0-based index of the form in the last AI message
};

export type GlobalAction = {
    type: 'submit_all'| 'cancel_all';
};

export type UpdateAction = {
    type: 'update_beam_form';
    targetContext: 'chat' | 'canvas';
    targetBeamName: string;
    updatedProperties: Partial<BeamInput>;
} | {
    type: 'update_element_form';
    targetContext: 'chat' | 'canvas';
    targetElementName: string;
    updatedProperties: Partial<Element>;
};

export type DownloadAction = {
    type: 'download_analysis';
    targetBeamNames: string[] | 'all';
    format: 'pdf' | 'csv';
};

// Actions for the confirmation workflow.
export type ConfirmAttachmentAnalysisAction = {
    type: 'confirm_attachment_analysis';
    fileName: string;
    userMessageText: string;
    userFile: FilePayload;
};

export type CancelAttachmentAnalysisAction = {
    type: 'cancel_attachment_analysis';
};

/** A single property change on target object T */
export interface PropertyUpdate<T> {
    /** The field name to update */
    property: keyof T;
    /** The new value for that field */
    value: T[keyof T];
}

export type FormManipulationAction = {
        type:
            | 'addSupport'
            | 'removeSupport'
            | 'editSupport'
            | 'addLoad'
            | 'removeLoad'
            | 'editLoad'
            | 'addAppliedLoad'
            | 'removeAppliedLoad'
            | 'editAppliedLoad'
            | 'addLoadCombination'
            | 'removeLoadCombination'
            | 'editLoadCombination'
            | 'addLoadCaseFactor'
            | 'removeLoadCaseFactor'
            | 'editLoadCaseFactor';
        targetIndex: number; // Index of the form within the message
        itemIndex?: number; // Index of the item to remove or edit (for remove/edit actions)
        parentIndex?: number; // Index of parent item (for nested actions like load case factors)
    /** Array of property‐value pairs describing the fields to update */
    updatedProperties?: PropertyUpdate<any>[];
};

export type LoadTransferAction = {
    type: 'add_load_transfer';
    sourceElementName: string;
    supportIndex: number;
    targetElementName: string;
    targetPosition: number; // Position on target element where load should be placed
    targetContext: 'chat' | 'canvas';
} | {
    type: 'remove_load_transfer';
    targetElementName: string;
    transferGroupId: string;
    targetContext: 'chat' | 'canvas';
};

export type Action = FormAction | GlobalAction | UpdateAction | DownloadAction | ConfirmAttachmentAnalysisAction | CancelAttachmentAnalysisAction | FormManipulationAction | LoadTransferAction;


// Represents the structured decision from the Gemini API.
export interface GeminiDecisionResponse {
    chat_response: string;
    beamInputs?: BeamInput[];
    ElementForms?: Element[];     // Structural element forms for design/analysis
    actions?: Action[];
}


// --- Canvas Types ---

export interface CanvasTextItem {
    id: string;
    type: 'text';
    title: string;
    content: string;
}

export interface CanvasBeamInputItem {
    id: string;
    type: 'beam_input';
    data: BeamInput;
    /** Optional analysis result merged into this item */
    outputData?: BeamOutput;
}

export interface CanvasBeamOutputItem {
    id: string;
    type: 'beam_output';
    inputData: BeamInput;
    outputData: BeamOutput;
}

export interface CanvasElementItem {
    id: string;
    type: 'element';
    data: Element;
}

export type CanvasItem = CanvasTextItem | CanvasBeamInputItem | CanvasBeamOutputItem | CanvasElementItem;

// --- Loading Library Types ---

export enum LoadingCategory {
    Dead = 'Dead',
    Live = 'Live',
    Wind = 'Wind',
    Snow = 'Snow',
    Other = 'Other',
}

export enum LoadUnit {
    kPa = 'kPa', // Area Load
    kN_m = 'kN/m', // Line Load
    kN = 'kN', // Point Load
}

export interface LoadingFormInput {
    name: string;
    category: LoadingCategory;
    magnitude: number;
    unit: LoadUnit;
}


export enum TributaryType {
    Floor = 'Floor',
    Roof = 'Roof',
    Wall = 'Wall',
}

export interface TributaryFormInput {
    name: string;
    type: TributaryType;
    dimension1: number; // For Floor/Roof, this is tributary width. For Wall, this is height.
}

// Defines the structure for the standard loads input in the upload modal.
export interface StandardLoads {
    floorDead: number;
    floorLive: number;
    roofDead: number;
    roofLive: number;
    roofWind: number;
    wallDead: number;
    wallLive: number;
    wallWind: number;
}


// Represents a user in the system
export interface User {
    id: string; // Firebase UID
    firstName: string;
    lastName: string;
    email: string;
    displayName: string;
    community?: string;
    country: string; // Use enum if more countries are needed
    discipline: string; // e.g., "Structural Engineer", "Architect", etc.
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    profilePictureUrl?: string;
    phone?: string;
    bio?: string; // Short biography or description
    role : string;
    lastconversationId? : string;
  }


// Represents a project.
// Represents a complete building project
export interface Project {
  // Basic project information
  id: string;
  name: string;
  description?: string;
  location: {
    address?: string;
    city: string;
    state?: string;
    country: string;
     
  };
  
  // Project timeline
   createdAt: Timestamp | Date | FieldValue;
    updatedAt: Timestamp | Date | FieldValue;
  startDate?: Date;
  targetCompletionDate?: Date;
  
  // Project ownership and team
  ownerId: string; // Firebase user ID of project owner
  projectMembers: User[];
  
  // Structural engineering specifics
  //designCriteria: DesignCriteria;
  //soilConditions?: SoilConditions;
  
  // Building information
  buildingInfo: {
    type: string; // residential, commercial, industrial, etc.
    stories: number;
    totalArea: number; // sq ft or sq m
    structuralSystem: string; // steel frame, concrete, wood, etc.
    foundationType: string; // spread footings, pile, mat, etc.
  };
  
  // Structural elements collection
  elements: Element[];
  
  // Element count for efficient querying (synced with subcollection count)
  elementCount?: number;
  
  // File attachments and references
  attachments?: {
    id: string;
    name: string;
    type: string; // drawing, specification, report, etc.
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
  }[];
  /** Standard load definitions in kPa for floor, roof, and wall beams */
  standardLoads?: StandardLoads[];
  
  // Project status and versioning
  status: 'draft' | 'in-progress' | 'under-review' | 'approved' | 'archived';
  version: string;
  isActive: boolean;
  
  // Integration with conversation system
  conversationIds?: string[]; // Associated chat conversations
}
// Represents a status message for UI feedback.
export interface StatusMessage {
    type: 'loading' | 'success' | 'error' | 'info';
    message: string;
    timestamp?: string;
    user?: User; // optional actor who triggered this status
}
