export type MessageRole = 'user' | 'model';

export interface QuickReply {
  label: string;
  prompt: string;
}

export interface Slide {
  type: string; // e.g., 'title', 'investment', 'deadlines'
  data: any; // Flexible data structure for different slide types
}

export interface PresentationData {
  slides: Slide[];
}

export interface QuotationItem {
  imageUrl: string;
  name: string;
  model: string;
  size: string;
  brand: string;
  brandUrl: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

export interface QuotationData {
  items: QuotationItem[];
}

export interface MessageFile {
  name: string;
  mimeType: string;
  data: string; // base64
}

export interface BriefingSection {
  title: string;
  content: string;
}

export interface BriefingData {
  title: string;
  sections: BriefingSection[];
}

export interface ExecutiveReviewItem {
  id: string;
  status: 'approved' | 'pending' | 'error'; // ✅, ⚠️, ❌
  description: string;
  details: string;
}

export interface ExecutiveReviewSection {
  title: string;
  items: ExecutiveReviewItem[];
}

export interface ExecutiveReviewData {
  project: string;
  file: string;
  date: string;
  summary: {
    status: string;
    approved: number;
    pending: number;
    error: number;
    topRisks: string[];
    actionPlan: string;
  };
  sections: ExecutiveReviewSection[];
}


export interface Message {
  role: MessageRole;
  content: string;
  files?: MessageFile[];
  quickReplies?: QuickReply[];
  attachments?: {
    name: string;
  }[];
  presentation?: PresentationData;
  quotation?: QuotationData;
  briefing?: BriefingData;
  executiveReview?: ExecutiveReviewData;
  imageUrl?: string;
  videoUrl?: string;
  soraPrompt?: {
      pt: string;
      en: string;
  };
}

export interface Intern {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  imageUrl?: string;
}

export type Page = 'home' | 'quem-sou' | 'projetos' | 'contato' | 'consultoria';


// FIX: Consolidate global window declarations to resolve conflicts.
// The AIStudio interface is moved into the `declare global` block to make it a truly global type.
// This prevents conflicts that can arise when different modules declare types with the same name.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    jspdf: any;
    html2canvas: any;
    // FIX: To resolve "All declarations of 'aistudio' must have identical modifiers", the property is made optional. This allows merging with other declarations that might define it differently.
    aistudio?: AIStudio;
  }
}
