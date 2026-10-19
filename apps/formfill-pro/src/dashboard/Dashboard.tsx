import React, { useState, useEffect } from 'react';
import { FormProfile, FormSnippet, FormFieldDefinition, StandardFieldType } from '@nexora/shared-types';
import { Button, IconButton, Badge, ConfirmationDialog, Input } from '@nexora/ui';
import { FormFillService, SUGGESTED_FIELD_TEMPLATES, SuggestedFieldTemplate } from '../services/formfill';
import {
  Plus,
  Trash2,
  User,
  FileText,
  Check,
  Copy,
  Sparkles,
  X,
} from 'lucide-react';

export const FormFillDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<FormProfile[]>([]);
  const [snippets, setSnippets] = useState<FormSnippet[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<FormProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'profiles' | 'snippets'>('profiles');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New field state
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [newFieldType, setNewFieldType] = useState<StandardFieldType>('custom');

  // Snippet CRUD state in Dashboard
  const [isAddingSnippet, setIsAddingSnippet] = useState(false);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetContent, setNewSnippetContent] = useState('');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [copiedValueId, setCopiedValueId] = useState<string | null>(null);

  const loadData = async () => {
    const [pList, sList] = await Promise.all([
      FormFillService.getProfiles(),
      FormFillService.getSnippets(),
    ]);
    setProfiles(pList);
    setSnippets(sList);
    if (!selectedProfile && pList.length > 0) {
      setSelectedProfile(pList[0]);
    } else if (selectedProfile) {
      const refreshed = pList.find((p) => p.id === selectedProfile.id);
      setSelectedProfile(refreshed || (pList.length > 0 ? pList[0] : null));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !newFieldLabel.trim()) return;

    // Check if title already exists
    const existing = selectedProfile.fields.find(
      (f) => f.label.toLowerCase() === newFieldLabel.trim().toLowerCase()
    );

    if (existing) {
      await handleAddValueToField(existing.id);
      setNewFieldLabel('');
      setNewFieldValue('');
      setIsAddingField(false);
      return;
    }

    const newField: FormFieldDefinition = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      value: newFieldValue.trim(),
      values: [newFieldValue.trim()],
    };

    const updated = {
      ...selectedProfile,
      fields: [...selectedProfile.fields, newField],
    };

    await FormFillService.saveProfile(updated);
    setNewFieldLabel('');
    setNewFieldValue('');
    setIsAddingField(false);
    await loadData();
  };

  const handleAddSuggestedField = async (template: SuggestedFieldTemplate) => {
    if (!selectedProfile) return;
    const existing = selectedProfile.fields.find(
      (f) => f.label.toLowerCase() === template.label.toLowerCase()
    );
    if (existing) {
      await handleAddValueToField(existing.id);
      return;
    }

    const newField: FormFieldDefinition = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: template.label,
      type: template.type,
      value: '',
      values: [''],
    };

    const updated = {
      ...selectedProfile,
      fields: [...selectedProfile.fields, newField],
    };

    await FormFillService.saveProfile(updated);
    await loadData();
  };

  const handleAddValueToField = async (fieldId: string) => {
    if (!selectedProfile) return;
    const updated = {
      ...selectedProfile,
      fields: selectedProfile.fields.map((f) => {
        if (f.id !== fieldId) return f;
        const currentVals = f.values && f.values.length > 0 ? [...f.values] : [f.value || ''];
        return {
          ...f,
          values: [...currentVals, ''],
        };
      }),
    };
    await FormFillService.saveProfile(updated);
    setSelectedProfile(updated);
  };

  const handleUpdateFieldValue = async (fieldId: string, valueIndex: number, val: string) => {
    if (!selectedProfile) return;
    const updated = {
      ...selectedProfile,
      fields: selectedProfile.fields.map((f) => {
        if (f.id !== fieldId) return f;
        const currentVals = f.values && f.values.length > 0 ? [...f.values] : [f.value || ''];
        currentVals[valueIndex] = val;
        return {
          ...f,
          value: currentVals[0] || '',
          values: currentVals,
        };
      }),
    };
    await FormFillService.saveProfile(updated);
    setSelectedProfile(updated);
  };

  const handleRemoveFieldValue = async (fieldId: string, valueIndex: number) => {
    if (!selectedProfile) return;
    const updated = {
      ...selectedProfile,
      fields: selectedProfile.fields.map((f) => {
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
      }),
    };
    await FormFillService.saveProfile(updated);
    setSelectedProfile(updated);
  };

  const handleRemoveField = async (fieldId: string) => {
    if (!selectedProfile) return;
    const updated = {
      ...selectedProfile,
      fields: selectedProfile.fields.filter((f) => f.id !== fieldId),
    };
    await FormFillService.saveProfile(updated);
    await loadData();
  };

  const handleCreateSnippet = async (e: React.FormEvent) => {
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

  const handleCopySnippet = (snip: FormSnippet) => {
    navigator.clipboard.writeText(snip.content);
    setCopiedSnippetId(snip.id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleCopyValue = (val: string, id: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedValueId(id);
    setTimeout(() => setCopiedValueId(null), 1500);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-600 flex items-center justify-center text-white font-bold text-xs">
              F
            </div>
            <span className="font-semibold text-sm">FormFill Pro Studio</span>
          </div>
          <Badge variant="warning">Privacy First</Badge>
        </div>

        {/* View toggle */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'profiles'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" /> Profiles ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('snippets')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'snippets'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Snippets ({snippets.length})
          </button>
        </div>

        {/* Profiles list */}
        {activeTab === 'profiles' ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p)}
                className={`w-full text-left p-3 rounded-lg text-xs transition-colors border ${
                  selectedProfile?.id === p.id
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30'
                    : 'border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                  {p.isDefault && <Badge size="sm" variant="warning">Default</Badge>}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{p.description}</p>
                <div className="text-[10px] text-slate-400 mt-2">{p.fields.length} field titles</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {snippets.map((snip) => (
              <div
                key={snip.id}
                className="p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>{snip.title}</span>
                  <IconButton
                    size="sm"
                    ariaLabel="Delete snippet"
                    onClick={async () => {
                      await FormFillService.deleteSnippet(snip.id);
                      await loadData();
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                  </IconButton>
                </div>
                <p className="text-slate-500 line-clamp-3 text-[11px]">{snip.content}</p>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
        {activeTab === 'profiles' && selectedProfile ? (
          <>
            <header className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedProfile.name}
                </h1>
                <p className="text-xs text-slate-500 mt-1">{selectedProfile.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  onClick={() => setIsAddingField(true)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Custom Field
                </Button>
                <IconButton
                  size="md"
                  ariaLabel="Delete Profile"
                  variant="danger"
                  onClick={() => setDeleteConfirmId(selectedProfile.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-6">
              {/* Suggested Fields Quick Palette */}
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Suggested Fields (Click to Add to Profile)
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    {selectedProfile.fields.length} active
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_FIELD_TEMPLATES.map((tpl) => {
                    const alreadyAdded = selectedProfile.fields.some(
                      (f) => f.label.toLowerCase() === tpl.label.toLowerCase()
                    );
                    return (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => handleAddSuggestedField(tpl)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          alreadyAdded
                            ? 'bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            : 'bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100/70 hover:scale-[1.02] shadow-2xs font-medium'
                        }`}
                      >
                        {alreadyAdded ? '+ Add Value' : `+ ${tpl.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isAddingField && (
                <form
                  onSubmit={handleAddField}
                  className="p-4 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
                >
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Add Custom Field Title to {selectedProfile.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Field Title / Label"
                      placeholder="e.g. Student ID No., Alternate Address, Major"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      required
                    />
                    <Input
                      label="Field Value"
                      placeholder="e.g. 21BCE1042"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsAddingField(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Save Field
                    </Button>
                  </div>
                </form>
              )}

              {/* Grid of Field Cards: ONE TITLE CARD with MULTIPLE VALUE INPUTS INSIDE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {selectedProfile.fields.map((field) => {
                  const values = field.values && field.values.length > 0 ? field.values : [field.value || ''];

                  return (
                    <div
                      key={field.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between group space-y-2.5 hover:border-amber-300 dark:hover:border-amber-800/60 transition-colors"
                    >
                      {/* Header: Title once */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider truncate">
                            {field.label}
                          </span>
                          {values.length > 1 && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                              {values.length} values
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAddValueToField(field.id)}
                            className="text-[10px] text-amber-600 hover:underline px-1 py-0.5 rounded font-medium flex items-center gap-0.5"
                            title="Add another value for this title"
                          >
                            <Plus className="w-2.5 h-2.5" /> Add Value
                          </button>
                          <IconButton
                            size="sm"
                            ariaLabel="Delete field"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveField(field.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                          </IconButton>
                        </div>
                      </div>

                      {/* Values inside this title */}
                      <div className="space-y-1.5">
                        {values.map((val, vIdx) => (
                          <div key={vIdx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder={vIdx === 0 ? `Enter ${field.label}...` : `Enter alternate ${field.label} (${vIdx + 1})...`}
                              value={val}
                              onChange={(e) => handleUpdateFieldValue(field.id, vIdx, e.target.value)}
                              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                            />
                            {val && (
                              <button
                                type="button"
                                onClick={() => handleCopyValue(val, `${field.id}_${vIdx}`)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors shrink-0"
                                title="Copy value"
                              >
                                {copiedValueId === `${field.id}_${vIdx}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            {values.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFieldValue(field.id, vIdx)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                                title="Remove this value"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Snippets View in Main Panel */
          <div className="flex-1 overflow-y-auto p-8 max-w-3xl space-y-6">
            <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Quick Snippet Manager
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Save text snippets (bios, cover letters, addresses) to copy and paste in 1 click.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsAddingSnippet(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                + Add Snippet
              </Button>
            </header>

            {isAddingSnippet && (
              <form
                onSubmit={handleCreateSnippet}
                className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
              >
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Create New Snippet
                </h3>
                <Input
                  label="Title"
                  placeholder="e.g. Professional Bio, Short Intro, Address"
                  value={newSnippetTitle}
                  onChange={(e) => setNewSnippetTitle(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Snippet Content
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Type or paste reusable content here..."
                    value={newSnippetContent}
                    onChange={(e) => setNewSnippetContent(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingSnippet(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Save Snippet
                  </Button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snippets.map((snip) => (
                <div
                  key={snip.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {snip.title}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] px-2"
                          onClick={() => handleCopySnippet(snip)}
                          icon={
                            copiedSnippetId === snip.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )
                          }
                        >
                          {copiedSnippetId === snip.id ? 'Copied' : 'Copy'}
                        </Button>
                        <IconButton
                          size="sm"
                          ariaLabel="Delete snippet"
                          variant="danger"
                          onClick={async () => {
                            await FormFillService.deleteSnippet(snip.id);
                            await loadData();
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-4 leading-relaxed font-normal">
                      {snip.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <ConfirmationDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Profile"
        message="Are you sure you want to permanently delete this form profile?"
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (deleteConfirmId) {
            await FormFillService.deleteProfile(deleteConfirmId);
            setDeleteConfirmId(null);
            await loadData();
          }
        }}
      />
    </div>
  );
};
