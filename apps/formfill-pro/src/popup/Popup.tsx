import React, { useState, useEffect } from 'react';
import { FormProfile, FormSnippet, DetectedFormField, FormFieldDefinition, StandardFieldType } from '@nexora/shared-types';
import { Button, IconButton, Badge, EmptyState, Input } from '@nexora/ui';
import { FormFillService, SUGGESTED_FIELD_TEMPLATES, SuggestedFieldTemplate } from '../services/formfill';
import {
  CheckSquare,
  Square,
  Zap,
  Copy,
  ExternalLink,
  Check,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  RefreshCw,
  X,
  Edit2,
  ChevronDown,
} from 'lucide-react';

export const FormFillPopup: React.FC = () => {
  const [profiles, setProfiles] = useState<FormProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [detectedFields, setDetectedFields] = useState<DetectedFormField[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Record<string, boolean>>({});
  const [snippets, setSnippets] = useState<FormSnippet[]>([]);
  const [activeTab, setActiveTab] = useState<'autofill' | 'fields' | 'snippets'>('autofill');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);
  const [fillFeedback, setFillFeedback] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Profile Management State
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');

  // Local drafted field values before saving
  const [draftFields, setDraftFields] = useState<FormFieldDefinition[]>([]);
  const [isFieldsDirty, setIsFieldsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Quick Snippet Add State
  const [isAddingSnippet, setIsAddingSnippet] = useState(false);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetContent, setNewSnippetContent] = useState('');

  // Field Edit / Add state in Popup
  const [isAddingField, setIsAddingField] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customFieldLabel, setCustomFieldLabel] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [customFieldType, setCustomFieldType] = useState<StandardFieldType>('custom');

  const loadData = async () => {
    setIsScanning(true);
    try {
      const [profList, snipList, fields] = await Promise.all([
        FormFillService.getProfiles(),
        FormFillService.getSnippets(),
        FormFillService.detectActiveFields(),
      ]);

      setProfiles(profList);
      setSnippets(snipList);
      setDetectedFields(fields);

      const defaultProf = profList.find((p) => p.isDefault) || profList[0];
      if (defaultProf && !selectedProfileId) {
        setSelectedProfileId(defaultProf.id);
        setDraftFields(defaultProf.fields);
      } else if (selectedProfileId) {
        const current = profList.find((p) => p.id === selectedProfileId);
        if (current) setDraftFields(current.fields);
      }
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentProfile = profiles.find((p) => p.id === selectedProfileId);

  // Compute matches
  const matches = currentProfile
    ? FormFillService.matchFieldsWithProfile(detectedFields, currentProfile)
    : [];

  // Initialize selected checks
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    matches.forEach((m) => {
      initial[m.field.elementSelector] = true;
    });
    setSelectedMatches(initial);
  }, [selectedProfileId, detectedFields.length]);

  const handleToggleMatch = (selector: string) => {
    setSelectedMatches((prev) => ({
      ...prev,
      [selector]: !prev[selector],
    }));
  };

  const handleApplyFill = async () => {
    const fillPlan = matches
      .filter((m) => selectedMatches[m.field.elementSelector])
      .map((m) => ({
        selector: m.field.elementSelector,
        value: m.matchedValue,
      }));

    if (fillPlan.length === 0) return;

    const res = await FormFillService.applyFillPlan(fillPlan);
    setFillFeedback(`Successfully filled ${res.filledCount} fields!`);
    setTimeout(() => setFillFeedback(null), 3500);
  };

  const handleRescan = async () => {
    setIsScanning(true);
    const fields = await FormFillService.detectActiveFields();
    setDetectedFields(fields);
    setIsScanning(false);
  };

  const handleCopySnippet = (snippet: FormSnippet) => {
    navigator.clipboard.writeText(snippet.content);
    setCopiedSnippetId(snippet.id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleDeleteSnippet = async (id: string) => {
    await FormFillService.deleteSnippet(id);
    await loadData();
  };

  const handleSaveSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnippetTitle.trim() || !newSnippetContent.trim()) return;

    const snip: FormSnippet = {
      id: `snip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newSnippetTitle.trim(),
      content: newSnippetContent.trim(),
      tags: ['custom'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await FormFillService.saveSnippet(snip);
    setNewSnippetTitle('');
    setNewSnippetContent('');
    setIsAddingSnippet(false);
    await loadData();
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    const target = profiles.find((p) => p.id === id);
    if (target) {
      setDraftFields(target.fields);
      setIsFieldsDirty(false);
      setSaveSuccessMsg(null);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const newProf: FormProfile = {
      id: `prof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newProfileName.trim(),
      description: newProfileDesc.trim() || 'Custom Autofill Profile',
      isDefault: profiles.length === 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fields: [
        { id: 'f_name', label: 'Full Name', type: 'fullName', value: '', values: [''] },
        { id: 'f_email', label: 'Email', type: 'email', value: '', values: [''] },
        { id: 'f_phone', label: 'Phone', type: 'phone', value: '', values: [''] },
      ],
    };

    await FormFillService.saveProfile(newProf);
    setNewProfileName('');
    setNewProfileDesc('');
    setIsCreatingProfile(false);
    await loadData();
    setSelectedProfileId(newProf.id);
    setDraftFields(newProf.fields);
  };

  const handleSaveProfileRename = async () => {
    if (!currentProfile || !editProfileName.trim()) return;
    const updated: FormProfile = {
      ...currentProfile,
      name: editProfileName.trim(),
      updatedAt: Date.now(),
    };
    await FormFillService.saveProfile(updated);
    setIsEditingProfileName(false);
    await loadData();
  };

  const handleDeleteCurrentProfile = async () => {
    if (!currentProfile) return;
    if (profiles.length <= 1) {
      alert('You must have at least one profile.');
      return;
    }
    const targetId = currentProfile.id;
    await FormFillService.deleteProfile(targetId);
    const remaining = profiles.filter((p) => p.id !== targetId);
    setSelectedProfileId(remaining[0]?.id || '');
    await loadData();
  };

  // Add a new field title to the profile (e.g. from suggestions or custom)
  const handleAddNewFieldTitle = (title: string, type: StandardFieldType, initialValue = '') => {
    // Check if title already exists
    const existing = draftFields.find((f) => f.label.toLowerCase() === title.toLowerCase());
    if (existing) {
      // If title exists, append a new value inside that title instead of a new card!
      handleAddValueToField(existing.id);
      return;
    }

    const newField: FormFieldDefinition = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: title,
      type: type || 'custom',
      value: initialValue,
      values: [initialValue],
    };

    setDraftFields((prev) => [...prev, newField]);
    setIsFieldsDirty(true);
  };

  // Add another VALUE inside an existing field title card
  const handleAddValueToField = (fieldId: string) => {
    setDraftFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const currentVals = f.values && f.values.length > 0 ? [...f.values] : [f.value || ''];
        return {
          ...f,
          values: [...currentVals, ''],
        };
      })
    );
    setIsFieldsDirty(true);
  };

  // Update a specific value at valueIndex inside a field title card
  const handleUpdateFieldValue = (fieldId: string, valueIndex: number, newVal: string) => {
    setDraftFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const currentVals = f.values && f.values.length > 0 ? [...f.values] : [f.value || ''];
        currentVals[valueIndex] = newVal;
        return {
          ...f,
          value: currentVals[0] || '',
          values: currentVals,
        };
      })
    );
    setIsFieldsDirty(true);
  };

  // Delete a specific value at valueIndex inside a field title card
  const handleRemoveFieldValue = (fieldId: string, valueIndex: number) => {
    setDraftFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const currentVals = f.values && f.values.length > 0 ? [...f.values] : [f.value || ''];
        if (currentVals.length <= 1) {
          return { ...f, value: '', values: [''] };
        }
        currentVals.splice(valueIndex, 1);
        return {
          ...f,
          value: currentVals[0] || '',
          values: currentVals,
        };
      })
    );
    setIsFieldsDirty(true);
  };

  // Delete the entire field title card
  const handleDeleteDraftField = (fieldId: string) => {
    setDraftFields((prev) => prev.filter((f) => f.id !== fieldId));
    setIsFieldsDirty(true);
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFieldLabel.trim()) return;

    handleAddNewFieldTitle(customFieldLabel.trim(), customFieldType, customFieldValue.trim());
    setCustomFieldLabel('');
    setCustomFieldValue('');
    setIsAddingField(false);
  };

  // Quick-add detected fields from current page to active profile
  const handleAddDetectedFieldsToProfile = () => {
    let addedCount = 0;
    detectedFields.forEach((df) => {
      const rawTitle = (df.label || df.name || df.id).trim();
      if (!rawTitle) return;
      const alreadyHas = draftFields.some(
        (f) => f.label.toLowerCase() === rawTitle.toLowerCase()
      );
      if (!alreadyHas) {
        handleAddNewFieldTitle(rawTitle, 'custom', df.currentValue || '');
        addedCount++;
      }
    });
    if (addedCount > 0) {
      setActiveTab('fields');
    }
  };

  // Explicit Save Button confirming changes in My Fields
  const handleSaveDraftFields = async () => {
    if (!currentProfile) return;
    const updated: FormProfile = {
      ...currentProfile,
      fields: draftFields,
      updatedAt: Date.now(),
    };

    await FormFillService.saveProfile(updated);
    setIsFieldsDirty(false);
    setSaveSuccessMsg('✓ All field changes saved to profile!');
    await loadData();
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleCopyValue = (val: string, id: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedFieldId(id);
    setTimeout(() => setCopiedFieldId(null), 1500);
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-amber-600 flex items-center justify-center text-white font-bold text-xs">
            F
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-100">
            FormFill Pro
          </span>
          <Badge size="sm" variant="warning">
            Private & Local
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            ariaLabel="Re-scan webpage fields"
            title="Re-scan active page"
            onClick={handleRescan}
            className={isScanning ? 'animate-spin' : ''}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton size="sm" ariaLabel="Open Studio" title="Open Fullscreen Studio" onClick={openDashboard}>
            <ExternalLink className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('autofill')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'autofill'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Autofill ({matches.length})
        </button>
        <button
          onClick={() => setActiveTab('fields')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'fields'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Fields ({draftFields.length})
        </button>
        <button
          onClick={() => setActiveTab('snippets')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'snippets'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Snippets ({snippets.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Active Profile Header & Switcher */}
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0">
                Active Profile:
              </span>
              {isEditingProfileName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    className="text-xs font-semibold px-1.5 py-0.5 rounded border border-amber-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveProfileRename}
                    className="text-xs text-emerald-600 font-bold hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingProfileName(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {currentProfile?.name}
                  </span>
                  <button
                    onClick={() => {
                      setEditProfileName(currentProfile?.name || '');
                      setIsEditingProfileName(true);
                    }}
                    className="text-slate-400 hover:text-amber-600 transition-colors"
                    title="Rename Profile"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreatingProfile(!isCreatingProfile)}
                className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-semibold transition-colors flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" /> New Profile
              </button>
              {profiles.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteCurrentProfile}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Delete current profile"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Profile Switcher Pills */}
          <div className="flex flex-wrap gap-1 pt-1">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectProfile(p.id)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  p.id === selectedProfileId
                    ? 'border-amber-500 bg-amber-500 text-white font-semibold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Inline Create Profile Form */}
          {isCreatingProfile && (
            <form
              onSubmit={handleCreateProfile}
              className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-2 mt-2 animate-in fade-in"
            >
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Create New Profile
              </div>
              <Input
                placeholder="Profile Name (e.g. Internship, College ERP)"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                required
              />
              <Input
                placeholder="Short description (optional)"
                value={newProfileDesc}
                onChange={(e) => setNewProfileDesc(e.target.value)}
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setIsCreatingProfile(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Create Profile
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Feedback message */}
        {fillFeedback && (
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 text-center animate-in fade-in">
            {fillFeedback}
          </div>
        )}

        {/* Tab 1: Autofill */}
        {activeTab === 'autofill' && (
          <div className="space-y-3">
            {/* Action Bar */}
            <Button
              size="sm"
              variant="primary"
              className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white font-semibold h-8"
              onClick={handleApplyFill}
              disabled={matches.length === 0}
              icon={<Zap className="w-3.5 h-3.5" />}
            >
              Autofill Form ({matches.filter((m) => selectedMatches[m.field.elementSelector]).length} fields)
            </Button>

            {/* Field Matches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Detected Matches on Page
                </span>
                <span className="text-[11px]">
                  {Object.values(selectedMatches).filter(Boolean).length} of {matches.length} selected
                </span>
              </div>

              {matches.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
                  {detectedFields.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Found {detectedFields.length} inputs on page, but values need matching:</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        The page has fields: <strong>{detectedFields.slice(0, 4).map((f) => f.label || f.name || 'Input').join(', ')}</strong>.
                        Add matching fields and values to your active profile <strong>{currentProfile?.name}</strong> to autofill them.
                      </div>
                      <div className="pt-1 flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleAddDetectedFieldsToProfile}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white flex-1"
                        >
                          + Quick-Add These Page Fields
                        </Button>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title="No input fields detected"
                      description="Make sure the form page is active and reloaded. Click the refresh icon at the top right to re-scan."
                    />
                  )}
                </div>
              ) : (
                matches.map((m) => {
                  const isChecked = Boolean(selectedMatches[m.field.elementSelector]);
                  return (
                    <div
                      key={m.field.elementSelector}
                      onClick={() => handleToggleMatch(m.field.elementSelector)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                        isChecked
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                          : 'border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 fill-amber-100 dark:fill-amber-950" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {m.field.label || m.field.name}
                          </span>
                          <span className="text-[10px] text-amber-600 font-medium shrink-0 ml-1">
                            {m.fieldLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                          ↳ {m.matchedValue}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ready to Autofill Right Now (Active Profile Catalog) */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" /> Ready to Autofill Right Now
                </span>
                <Badge size="sm" variant="info">
                  {currentProfile?.fields.filter((f) => (f.values ? f.values.some((v) => v.trim()) : f.value.trim())).length || 0} fields
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Values saved in <strong>{currentProfile?.name}</strong> ready to be matched & filled:
              </p>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {currentProfile?.fields.filter((f) => (f.values ? f.values.some((v) => v.trim()) : f.value.trim())).length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center italic">
                    No values added yet. Switch to "My Fields" tab to add your details!
                  </div>
                ) : (
                  currentProfile?.fields
                    .filter((f) => (f.values ? f.values.some((v) => v.trim()) : f.value.trim()))
                    .map((field) => {
                      const vals = field.values && field.values.length > 0
                        ? field.values.filter((v) => v.trim())
                        : (field.value.trim() ? [field.value.trim()] : []);
                      return (
                        <div
                          key={field.id}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                              {field.label}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {vals.length} {vals.length === 1 ? 'entry' : 'entries'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {vals.map((v, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-700/50"
                              >
                                <span className="text-slate-900 dark:text-slate-100 font-mono text-[11px] truncate">
                                  {v}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyValue(v, `${field.id}_${i}`)}
                                  className="text-slate-400 hover:text-amber-600 transition-colors ml-2 shrink-0"
                                  title="Copy"
                                >
                                  {copiedFieldId === `${field.id}_${i}` ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: My Fields with in-card multiple values & explicit SAVE BUTTON */}
        {activeTab === 'fields' && currentProfile && (
          <div className="space-y-3">
            {/* Save Status Banner */}
            {saveSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 text-center animate-in fade-in">
                {saveSuccessMsg}
              </div>
            )}

            {/* Suggested Fields Quick Picker */}
            <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Suggested Fields
                </span>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="text-[11px] text-amber-600 hover:underline"
                >
                  {showSuggestions ? 'Hide' : '+ Browse All'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {SUGGESTED_FIELD_TEMPLATES.slice(0, showSuggestions ? undefined : 8).map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => handleAddNewFieldTitle(tpl.label, tpl.type)}
                    className="text-[10px] px-2 py-0.5 rounded-md border bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100/70 transition-colors font-medium shadow-2xs"
                  >
                    + {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Field Adder Form */}
            {isAddingField ? (
              <form
                onSubmit={handleAddCustomField}
                className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-2"
              >
                <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Add Custom Field
                </div>
                <Input
                  placeholder="Field Title (e.g. Student ID No., Alternate Address)"
                  value={customFieldLabel}
                  onChange={(e) => setCustomFieldLabel(e.target.value)}
                  required
                />
                <Input
                  placeholder="Field Value (e.g. 21BCE1042)"
                  value={customFieldValue}
                  onChange={(e) => setCustomFieldValue(e.target.value)}
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingField(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" type="submit">
                    Add to Profile
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 justify-center text-xs h-7.5"
                  onClick={() => setIsAddingField(true)}
                  icon={<Plus className="w-3 h-3" />}
                >
                  + Add Custom Title / Field
                </Button>
                {/* Explicit SAVE BUTTON */}
                <Button
                  size="sm"
                  variant="primary"
                  className={`text-xs h-7.5 px-3 font-semibold ${
                    isFieldsDirty ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                  onClick={handleSaveDraftFields}
                  icon={<Check className="w-3.5 h-3.5" />}
                >
                  Save Changes
                </Button>
              </div>
            )}

            {/* Current Fields List: ONE TITLE CARD with MULTIPLE VALUE INPUTS INSIDE */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Fields in {currentProfile.name}</span>
                {isFieldsDirty && <span className="text-amber-600 font-bold">• Unsaved changes</span>}
              </div>

              {draftFields.map((field) => {
                const values = field.values && field.values.length > 0 ? field.values : [field.value || ''];

                return (
                  <div
                    key={field.id}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2 group"
                  >
                    {/* Field Header: One Title */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                          {field.label}
                        </span>
                        {values.length > 1 && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                            {values.length} values
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* + Add Another value INSIDE this same title */}
                        <button
                          type="button"
                          onClick={() => handleAddValueToField(field.id)}
                          className="text-[10px] text-amber-600 hover:underline px-1 py-0.5 rounded font-medium flex items-center gap-0.5"
                          title="Add another value for this title"
                        >
                          <Plus className="w-2.5 h-2.5" /> Add Value
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraftField(field.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete field"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Multiple value input rows inside this single title card */}
                    <div className="space-y-1.5">
                      {values.map((val, vIdx) => (
                        <div key={vIdx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder={vIdx === 0 ? `Enter ${field.label}...` : `Enter alternate ${field.label} (${vIdx + 1})...`}
                            value={val}
                            onChange={(e) => handleUpdateFieldValue(field.id, vIdx, e.target.value)}
                            className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                          />
                          {val && (
                            <button
                              type="button"
                              onClick={() => handleCopyValue(val, `${field.id}_${vIdx}`)}
                              className="p-1 text-slate-400 hover:text-amber-600 transition-colors shrink-0"
                              title="Copy value"
                            >
                              {copiedFieldId === `${field.id}_${vIdx}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                          {values.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFieldValue(field.id, vIdx)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                              title="Remove this value"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Save Action Bar */}
            <div className="pt-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveDraftFields}
                className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white font-semibold h-8"
                icon={<Check className="w-4 h-4" />}
              >
                Confirm & Save Changes to Profile
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Quick Snippets */}
        {activeTab === 'snippets' && (
          <div className="space-y-3">
            {isAddingSnippet ? (
              <form
                onSubmit={handleSaveSnippet}
                className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-2 animate-in fade-in duration-150"
              >
                <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  New Snippet
                </div>
                <Input
                  placeholder="Snippet Title (e.g. Bio, Cover Note, Address)"
                  value={newSnippetTitle}
                  onChange={(e) => setNewSnippetTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Paste or write snippet text here..."
                  value={newSnippetContent}
                  onChange={(e) => setNewSnippetContent(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingSnippet(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" type="submit">
                    Save Snippet
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-center text-xs h-7.5"
                onClick={() => setIsAddingSnippet(true)}
                icon={<Plus className="w-3 h-3" />}
              >
                + Add Quick Snippet
              </Button>
            )}

            <div className="space-y-2">
              {snippets.length === 0 ? (
                <EmptyState
                  title="No snippets saved"
                  description="Save frequent answers, addresses, or bio notes to copy in one click."
                />
              ) : (
                snippets.map((snip) => (
                  <div
                    key={snip.id}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {snip.title}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(snip)}
                          className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                          title="Copy snippet"
                        >
                          {copiedSnippetId === snip.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSnippet(snip.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete snippet"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {snip.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
