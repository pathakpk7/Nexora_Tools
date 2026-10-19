// ==========================================
// NEXORA TOOLS: SHARED TYPES
// ==========================================

export type ExtensionId = 'tabmind' | 'pagepocket' | 'linksentry' | 'formfill-pro' | 'citeright' | 'lecturemark';

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

// -------------------------
// TabMind Types
// -------------------------
export interface SavedTab {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  pinned?: boolean;
  groupName?: string;
  groupColor?: string;
}

export interface WorkspaceGroupInfo {
  title: string;
  color?: string;
  tabCount: number;
}

export interface WorkspaceSession extends BaseEntity {
  name: string;
  description?: string;
  color?: string;
  tabs: SavedTab[];
  groups?: WorkspaceGroupInfo[];
  tags?: string[];
}

export interface DuplicateTabGroup {
  url: string;
  count: number;
  tabIds: number[];
  titles: string[];
}

// -------------------------
// PagePocket & ContextClip Types
// -------------------------
export type ReadingStatus = 'unread' | 'reading' | 'completed';
export type SavedContentType = 'page' | 'highlight' | 'article';

export interface PagePocketItem extends BaseEntity {
  url: string;
  title: string;
  favIconUrl?: string;
  type: SavedContentType;
  readingStatus: ReadingStatus;
  isFavorite: boolean;
  userNotes?: string;
  tags: string[];
  // For text highlights / clipped notes
  selectedText?: string;
  // ContextClip additions
  project?: string; // e.g. "GATE Preparation", "Final Year Project", "Research Paper"
  annotation?: string; // Personal annotation / commentary
  citation?: {
    apa?: string;
    mla?: string;
    ieee?: string;
  };
  summary?: string; // AI / Smart summary
  isDuplicate?: boolean; // Detected duplicate note
  // For extracted clean reader view
  cleanArticleText?: string;
  byline?: string;
  domain: string;
}

export interface ContextClipProject {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

// -------------------------
// CiteRight Types
// -------------------------
export type CitationStyle = 'apa' | 'mla' | 'ieee' | 'chicago' | 'harvard' | 'bibtex';

export interface BibliographicMetadata {
  title: string;
  authors: string[];
  publicationDate?: string;
  year?: string;
  journalOrPublisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  isbn?: string;
  issn?: string;
  url: string;
  accessDate: string;
  sourceType: 'journal' | 'website' | 'book' | 'conference' | 'preprint' | 'news';
  // Distinguishes verified metadata from inferred / missing info
  verifiedFields: {
    title: boolean;
    authors: boolean;
    publicationDate: boolean;
    journalOrPublisher: boolean;
    doi: boolean;
    isbn?: boolean;
  };
  inferredFields: {
    year: boolean;
    sourceType: boolean;
  };
  rawMetaTags?: Record<string, string>;
}

export interface CitationItem extends BaseEntity {
  metadata: BibliographicMetadata;
  project?: string;
  tags?: string[];
  notes?: string;
  customCitation?: string;
  isFavorite?: boolean;
}

// -------------------------
// LinkSentry Types
// -------------------------
export type LinkHealthStatus = 'healthy' | 'redirected' | 'unavailable' | 'uncertain' | 'unsupported';

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folderPath?: string;
  dateAdded?: number;
}

export interface LinkScanResult {
  bookmarkId: string;
  url: string;
  finalUrl?: string;
  status: LinkHealthStatus;
  httpStatus?: number;
  statusCodeText?: string;
  durationMs: number;
  scannedAt: number;
  error?: string;
  redirectChain?: string[];
}

export interface ScanSummary {
  total: number;
  healthy: number;
  redirected: number;
  unavailable: number;
  uncertain: number;
  unsupported: number;
  duplicates: number;
}

// -------------------------
// FormFill Pro Types
// -------------------------
export type StandardFieldType =
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'country'
  | 'college'
  | 'collegeName'
  | 'collegeId'
  | 'rollNumber'
  | 'major'
  | 'degree'
  | 'graduationYear'
  | 'gpa'
  | 'linkedin'
  | 'github'
  | 'portfolio'
  | 'custom';

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: StandardFieldType;
  value: string;
  values?: string[];
}

export interface FormProfile extends BaseEntity {
  name: string;
  description?: string;
  isDefault?: boolean;
  fields: FormFieldDefinition[];
}

export interface FormSnippet extends BaseEntity {
  title: string;
  content: string;
  tags?: string[];
}

export interface DetectedFormField {
  elementSelector: string;
  name: string;
  id: string;
  type: string;
  label: string;
  placeholder: string;
  autocomplete?: string;
  matchedFieldId?: string;
  matchedValue?: string;
  confidence: number;
}

// -------------------------
// LectureMark Types
// -------------------------
export interface LectureNote extends BaseEntity {
  lectureId: string;
  timestampSeconds: number;
  formattedTimestamp: string;
  title?: string;
  content: string;
  tags: string[]; // e.g. 'Exam', 'Doubt', 'Important', 'Assignment', 'Chapter'
  isChapter?: boolean;
  isRevised?: boolean;
}

export interface LectureItem extends BaseEntity {
  videoUrl: string;
  videoId: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  lastPositionSeconds?: number;
  tags?: string[];
  notesCount?: number;
}

export interface ActiveVideoPlaybackState {
  hasVideo: boolean;
  videoUrl: string;
  videoId: string;
  title: string;
  channelName?: string;
  currentTime: number;
  duration: number;
  formattedCurrentTime: string;
  formattedDuration: string;
  paused: boolean;
}

