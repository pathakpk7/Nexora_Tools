import { FormProfile, FormSnippet, DetectedFormField, StandardFieldType } from '@nexora/shared-types';
import { ChromeStorageAdapter } from '@nexora/storage';

const profileStorage = new ChromeStorageAdapter<FormProfile[]>('formfill');
const snippetStorage = new ChromeStorageAdapter<FormSnippet[]>('formfill');

const PROFILES_KEY = 'profiles';
const SNIPPETS_KEY = 'snippets';

export interface SuggestedFieldTemplate {
  label: string;
  type: StandardFieldType;
  placeholder: string;
  category: 'Personal' | 'Academic' | 'Contact' | 'Social' | 'Custom';
}

export const SUGGESTED_FIELD_TEMPLATES: SuggestedFieldTemplate[] = [
  { label: 'First Name', type: 'firstName', placeholder: 'e.g. John', category: 'Personal' },
  { label: 'Last Name', type: 'lastName', placeholder: 'e.g. Doe', category: 'Personal' },
  { label: 'Full Name', type: 'fullName', placeholder: 'e.g. John Doe', category: 'Personal' },
  { label: 'Email', type: 'email', placeholder: 'e.g. john@example.com', category: 'Contact' },
  { label: 'Phone', type: 'phone', placeholder: 'e.g. +1 555-0199', category: 'Contact' },
  { label: 'College / University Name', type: 'collegeName', placeholder: 'e.g. Stanford University', category: 'Academic' },
  { label: 'College ID / Student ID', type: 'collegeId', placeholder: 'e.g. STU-2024-88', category: 'Academic' },
  { label: 'Roll Number', type: 'rollNumber', placeholder: 'e.g. 21BCE1042', category: 'Academic' },
  { label: 'Password / PIN', type: 'custom', placeholder: 'e.g. your password', category: 'Custom' },
  { label: 'Major / Branch', type: 'major', placeholder: 'e.g. Computer Science', category: 'Academic' },
  { label: 'Degree', type: 'degree', placeholder: 'e.g. B.Tech / B.S.', category: 'Academic' },
  { label: 'Graduation Year', type: 'graduationYear', placeholder: 'e.g. 2026', category: 'Academic' },
  { label: 'GPA / Percentage', type: 'gpa', placeholder: 'e.g. 3.8 / 85%', category: 'Academic' },
  { label: 'LinkedIn URL', type: 'linkedin', placeholder: 'https://linkedin.com/in/...', category: 'Social' },
  { label: 'GitHub URL', type: 'github', placeholder: 'https://github.com/...', category: 'Social' },
  { label: 'Portfolio URL', type: 'portfolio', placeholder: 'https://...', category: 'Social' },
  { label: 'Address Line 1', type: 'addressLine1', placeholder: 'Street address', category: 'Contact' },
  { label: 'City', type: 'city', placeholder: 'e.g. San Francisco', category: 'Contact' },
  { label: 'State', type: 'state', placeholder: 'e.g. CA', category: 'Contact' },
  { label: 'Zip Code', type: 'zipCode', placeholder: 'e.g. 94105', category: 'Contact' },
];

const DEFAULT_PROFILES: FormProfile[] = [
  {
    id: 'prof_student',
    name: 'Student & Academic Profile',
    description: 'College applications, hackathons, and ERP portals',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: [
      { id: '1', label: 'First Name', type: 'firstName', value: '', values: [''] },
      { id: '2', label: 'Last Name', type: 'lastName', value: '', values: [''] },
      { id: '3', label: 'Email', type: 'email', value: '', values: [''] },
      { id: '4', label: 'College Name', type: 'collegeName', value: '', values: [''] },
      { id: '5', label: 'Student ID No.', type: 'collegeId', value: '', values: [''] },
      { id: '6', label: 'Roll Number', type: 'rollNumber', value: '', values: [''] },
      { id: '7', label: 'Degree & Branch', type: 'degree', value: '', values: [''] },
      { id: '8', label: 'Graduation Year', type: 'graduationYear', value: '', values: [''] },
      { id: '9', label: 'LinkedIn', type: 'linkedin', value: '', values: [''] },
      { id: '10', label: 'GitHub', type: 'github', value: '', values: [''] },
    ],
  },
  {
    id: 'prof_personal',
    name: 'Personal & Job Profile',
    description: 'General personal contact details and job portals',
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: [
      { id: '11', label: 'Full Name', type: 'fullName', value: '', values: [''] },
      { id: '12', label: 'Email', type: 'email', value: '', values: [''] },
      { id: '13', label: 'Phone', type: 'phone', value: '', values: [''] },
      { id: '14', label: 'City', type: 'city', value: '', values: [''] },
      { id: '15', label: 'Portfolio', type: 'portfolio', value: '', values: [''] },
    ],
  },
];

const DEFAULT_SNIPPETS: FormSnippet[] = [
  {
    id: 'snip_intro',
    title: 'Short Bio',
    content: 'Student and developer passionate about software engineering and building impactful products.',
    tags: ['bio', 'intro'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export class FormFillService {
  static async getProfiles(): Promise<FormProfile[]> {
    const stored = await profileStorage.get(PROFILES_KEY);
    if (!stored || stored.length === 0) {
      await profileStorage.set(PROFILES_KEY, DEFAULT_PROFILES);
      return DEFAULT_PROFILES;
    }
    return stored;
  }

  static async saveProfile(profile: FormProfile): Promise<void> {
    const list = await this.getProfiles();
    const idx = list.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      list[idx] = { ...profile, updatedAt: Date.now() };
    } else {
      list.push({ ...profile, createdAt: Date.now(), updatedAt: Date.now() });
    }
    await profileStorage.set(PROFILES_KEY, list);
  }

  static async deleteProfile(id: string): Promise<void> {
    let list = await this.getProfiles();
    list = list.filter((p) => p.id !== id);
    await profileStorage.set(PROFILES_KEY, list);
  }

  static async getSnippets(): Promise<FormSnippet[]> {
    const stored = await snippetStorage.get(SNIPPETS_KEY);
    if (!stored || stored.length === 0) {
      await snippetStorage.set(SNIPPETS_KEY, DEFAULT_SNIPPETS);
      return DEFAULT_SNIPPETS;
    }
    return stored;
  }

  static async saveSnippet(snippet: FormSnippet): Promise<void> {
    const list = await this.getSnippets();
    const idx = list.findIndex((s) => s.id === snippet.id);
    if (idx >= 0) {
      list[idx] = { ...snippet, updatedAt: Date.now() };
    } else {
      list.push({ ...snippet, createdAt: Date.now(), updatedAt: Date.now() });
    }
    await snippetStorage.set(SNIPPETS_KEY, list);
  }

  static async deleteSnippet(id: string): Promise<void> {
    let list = await this.getSnippets();
    list = list.filter((s) => s.id !== id);
    await snippetStorage.set(SNIPPETS_KEY, list);
  }

  /**
   * Detects form fields on the active webpage across all websites (Google Forms, ERP, college portals, job forms, etc.)
   */
  static async detectActiveFields(): Promise<DetectedFormField[]> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
        // Attempt 1: sendMessage to content script
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_FIELDS' });
          if (res?.fields && res.fields.length > 0) {
            return res.fields;
          }
        } catch {
          // Content script not loaded yet (e.g. page was opened before extension was reloaded)
        }

        // Attempt 2: fallback to direct executeScript on the active tab
        try {
          if (chrome.scripting) {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                function extractLabel(el: Element): string {
                  if (el.id) {
                    try {
                      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
                      if (lbl && lbl.textContent?.trim()) return lbl.textContent.trim();
                    } catch {}
                  }

                  const parentLabel = el.closest('label');
                  if (parentLabel && parentLabel.textContent?.trim()) {
                    const clone = parentLabel.cloneNode(true) as HTMLElement;
                    clone.querySelectorAll('input, select, textarea, button').forEach((c) => c.remove());
                    if (clone.textContent?.trim()) return clone.textContent.trim();
                  }

                  const aria = el.getAttribute('aria-label');
                  if (aria && aria.trim()) return aria.trim();

                  const placeholder = el.getAttribute('placeholder');
                  if (placeholder && placeholder.trim()) return placeholder.trim();

                  const titleAttr = el.getAttribute('title');
                  if (titleAttr && titleAttr.trim()) return titleAttr.trim();

                  // Preceding sibling (e.g. <span>Student ID</span><input />)
                  let prev = el.previousElementSibling;
                  while (prev) {
                    const txt = prev.textContent?.trim();
                    if (txt && txt.length > 0 && txt.length < 60) {
                      return txt.replace(/[:*]/g, '').replace(/\s+/g, ' ').trim();
                    }
                    prev = prev.previousElementSibling;
                  }

                  // Table cell previous sibling: <td>Student ID No.:</td><td><input /></td>
                  const td = el.closest('td');
                  if (td && td.previousElementSibling) {
                    const pTd = td.previousElementSibling;
                    const txt = pTd.textContent?.trim();
                    if (txt && txt.length > 0 && txt.length < 60) {
                      return txt.replace(/[:*]/g, '').replace(/\s+/g, ' ').trim();
                    }
                  }

                  // Parent container
                  const container = el.closest('.form-group, .form-row, .input-group, .field, tr, div');
                  if (container) {
                    const clone = container.cloneNode(true) as HTMLElement;
                    clone.querySelectorAll('input, select, textarea, button, script, style').forEach((c) => c.remove());
                    const firstLine = clone.textContent?.trim().split('\n')[0]?.trim();
                    if (firstLine && firstLine.length > 0 && firstLine.length < 50) {
                      return firstLine.replace(/[:*]/g, '').replace(/\s+/g, ' ').trim();
                    }
                  }

                  const raw = el.getAttribute('name') || el.id || '';
                  if (raw) {
                    const human = raw
                      .replace(/^(txt|input|sel|txt_|inp_)/i, '')
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/[_-]/g, ' ')
                      .trim();
                    if (human.length > 1) return human;
                  }

                  return '';
                }

                const inputs = Array.from(
                  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]), select, textarea'
                  )
                );

                return inputs.slice(0, 80).map((el, index) => {
                  const labelText = extractLabel(el);

                  let selector = '';
                  if (el.id) {
                    selector = `#${CSS.escape(el.id)}`;
                  } else if (el.name) {
                    selector = `[name="${CSS.escape(el.name)}"]`;
                  } else {
                    selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
                  }

                  return {
                    elementSelector: selector,
                    name: el.name || '',
                    id: el.id || '',
                    type: el.tagName.toLowerCase() === 'select' ? 'select' : el.getAttribute('type') || 'text',
                    label: labelText,
                    placeholder: el.getAttribute('placeholder') || '',
                    autocomplete: el.getAttribute('autocomplete') || '',
                    currentValue: el.value || '',
                    isDisabled: el.disabled || el.readOnly,
                  };
                });
              },
            });

            if (results && results[0] && Array.isArray(results[0].result)) {
              return results[0].result;
            }
          }
        } catch (scriptErr) {
          console.warn('[FormFill Pro] Direct scripting inspection error:', scriptErr);
        }
        return [];
      }
    }

    // Mock fields in dev
    return [
      {
        elementSelector: '#full_name',
        name: 'full_name',
        id: 'full_name',
        type: 'text',
        label: 'Candidate Full Name',
        placeholder: 'Enter full name',
        confidence: 0.95,
      },
      {
        elementSelector: '#email_addr',
        name: 'email',
        id: 'email_addr',
        type: 'email',
        label: 'Email Address',
        placeholder: 'name@domain.com',
        confidence: 0.98,
      },
      {
        elementSelector: '#university',
        name: 'college',
        id: 'university',
        type: 'text',
        label: 'College / Institute Name',
        placeholder: 'University name',
        confidence: 0.9,
      },
    ];
  }

  /**
   * Matches profile values to detected fields intelligently across standard and custom fields
   */
  static matchFieldsWithProfile(
    fields: DetectedFormField[],
    profile: FormProfile
  ): { field: DetectedFormField; matchedValue: string; fieldLabel: string; matchConfidence: number }[] {
    const matches: {
      field: DetectedFormField;
      matchedValue: string;
      fieldLabel: string;
      matchConfidence: number;
    }[] = [];

    const fieldPatterns: Record<string, RegExp[]> = {
      fullName: [/name/i, /full.*name/i, /candidate.*name/i],
      firstName: [/first.*name/i, /fname/i, /given.*name/i],
      lastName: [/last.*name/i, /lname/i, /surname/i],
      email: [/email/i, /mail/i],
      phone: [/phone/i, /tel/i, /mobile/i, /contact/i],
      addressLine1: [/address/i, /street/i, /addr/i],
      city: [/city/i, /town/i],
      state: [/state/i, /province/i, /region/i],
      zipCode: [/zip/i, /postal/i, /pincode/i, /pin.*code/i],
      college: [/college/i, /university/i, /school/i, /institute/i, /campus/i],
      collegeName: [/college.*name/i, /university.*name/i, /institute.*name/i, /college/i, /campus/i],
      collegeId: [/college.*id/i, /student.*id/i, /campus.*id/i, /reg.*no/i, /registration/i, /enrollment/i, /id.*no/i, /roll.*no/i, /roll.*number/i, /rollno/i, /usn/i],
      rollNumber: [/roll.*no/i, /roll.*number/i, /rollno/i, /enrollment/i, /usn/i, /student.*id/i],
      major: [/major/i, /branch/i, /department/i, /specialization/i, /stream/i, /discipline/i],
      degree: [/degree/i, /program/i, /course/i],
      graduationYear: [/grad/i, /year/i, /batch/i, /passing/i],
      gpa: [/gpa/i, /cgpa/i, /percentage/i, /marks/i, /score/i],
      linkedin: [/linkedin/i],
      github: [/github/i],
      portfolio: [/portfolio/i, /website/i, /url/i],
    };

    for (const detected of fields) {
      const probeText = `${detected.name} ${detected.id} ${detected.label} ${detected.placeholder} ${detected.autocomplete || ''}`.toLowerCase();

      let bestMatch: { label: string; value: string; confidence: number } | null = null;

      for (const pField of profile.fields) {
        // Collect candidate values (multi-value support inside the title)
        const candidateValues = (pField.values && pField.values.length > 0)
          ? pField.values.filter((v) => v && v.trim().length > 0)
          : (pField.value && pField.value.trim().length > 0 ? [pField.value.trim()] : []);

        if (candidateValues.length === 0) continue;

        // 1. Direct label or fuzzy title matching
        const cleanPLabel = pField.label.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        const detectedLabel = (detected.label || detected.name || detected.id).toLowerCase();

        let isMatch = false;
        if (cleanPLabel.length > 1 && (detectedLabel.includes(cleanPLabel) || cleanPLabel.includes(detectedLabel))) {
          isMatch = true;
        }

        // 2. Pattern based matching
        if (!isMatch) {
          const patterns = fieldPatterns[pField.type] || [new RegExp(cleanPLabel, 'i')];
          for (const pattern of patterns) {
            if (pattern.test(probeText)) {
              isMatch = true;
              break;
            }
          }
        }

        if (isMatch) {
          // If the detected field has a sequence indicator (e.g. phone2, address 2)
          let chosenVal = candidateValues[0];
          const numMatch = probeText.match(/(?:line|no|num|#)?\s*([1-9])/);
          if (numMatch && candidateValues.length > 1) {
            const idx = parseInt(numMatch[1], 10) - 1;
            if (candidateValues[idx]) {
              chosenVal = candidateValues[idx];
            }
          }

          bestMatch = {
            label: pField.label,
            value: chosenVal,
            confidence: 0.95,
          };
          break;
        }
      }

      if (bestMatch) {
        matches.push({
          field: detected,
          matchedValue: bestMatch.value,
          fieldLabel: bestMatch.label,
          matchConfidence: bestMatch.confidence,
        });
      }
    }

    return matches;
  }

  /**
   * Applies approved fill plan into webpage with direct fallback execution
   */
  static async applyFillPlan(
    fillPlan: { selector: string; value: string }[]
  ): Promise<{ filledCount: number }> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://')) {
        // Attempt 1: sendMessage
        try {
          const res = await chrome.tabs.sendMessage(tab.id, {
            type: 'APPLY_FILL',
            fillPlan,
          });
          if (res?.results?.filledCount !== undefined) {
            return res.results;
          }
        } catch {
          // Fallback to direct executeScript
        }

        // Attempt 2: direct executeScript fallback
        try {
          if (chrome.scripting) {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              args: [fillPlan],
              func: (plan: { selector: string; value: string }[]) => {
                let filled = 0;
                for (const item of plan) {
                  if (!item.value) continue;
                  try {
                    const el = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                      item.selector
                    );
                    if (!el || el.disabled || el.readOnly) continue;

                    if (el instanceof HTMLSelectElement) {
                      const lower = item.value.toLowerCase().trim();
                      const matchedOption = Array.from(el.options).find(
                        (opt) =>
                          opt.value.toLowerCase().trim() === lower ||
                          opt.text.toLowerCase().trim() === lower ||
                          opt.text.toLowerCase().includes(lower)
                      );
                      if (matchedOption) {
                        el.value = matchedOption.value;
                      } else {
                        el.value = item.value;
                      }
                    } else {
                      const nativeSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        'value'
                      )?.set;

                      if (nativeSetter && el instanceof HTMLInputElement) {
                        nativeSetter.call(el, item.value);
                      } else {
                        el.value = item.value;
                      }
                    }

                    el.dispatchEvent(new Event('focus', { bubbles: true }));
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));

                    const originalOutline = el.style.outline;
                    el.style.outline = '2px solid #f59e0b';
                    setTimeout(() => {
                      el.style.outline = originalOutline;
                    }, 1400);

                    filled++;
                  } catch (e) {
                    console.warn('[FormFill Pro] Fill error:', item.selector, e);
                  }
                }
                return filled;
              },
            });

            if (results && results[0] && typeof results[0].result === 'number') {
              return { filledCount: results[0].result };
            }
          }
        } catch (scriptErr) {
          console.warn('[FormFill Pro] Direct script fill error:', scriptErr);
        }

        return { filledCount: 0 };
      }
    }
    return { filledCount: fillPlan.length };
  }
}
