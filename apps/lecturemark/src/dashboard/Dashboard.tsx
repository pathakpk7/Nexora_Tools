import React, { useState, useEffect } from 'react';
import { LectureItem, LectureNote } from '@nexora/shared-types';
import { LectureMarkService } from '../services/lecturemark';
import {
  formatSecondsToTimestamp,
  buildTimestampedVideoUrl,
} from '@nexora/browser-utils';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Circle,
  Play,
  Download,
  Trash2,
  ExternalLink,
  Layers,
  Clock,
  Tag,
  ListOrdered,
  FileText,
  RotateCcw,
  Upload,
  ArrowRight,
  Filter,
  Check,
  X,
  GraduationCap,
  FilePenLine,
} from 'lucide-react';

const PRESET_TAGS = ['Exam', 'Doubt', 'Important', 'Assignment', 'Chapter'];

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'revision' | 'search' | 'backup'>('library');
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [lectureNotesMap, setLectureNotesMap] = useState<Record<string, LectureNote[]>>({});
  const [loading, setLoading] = useState(true);

  // Selected lecture for details view modal
  const [selectedLecture, setSelectedLecture] = useState<LectureItem | null>(null);
  const [selectedLectureNotes, setSelectedLectureNotes] = useState<LectureNote[]>([]);
  const [detailsTab, setDetailsTab] = useState<'notes' | 'chapters'>('notes');

  // Search & Filters in Library
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryTagFilter, setLibraryTagFilter] = useState('all');

  // Revision Workspace States
  const [revisionLectures, setRevisionLectures] = useState<LectureItem[]>([]);
  const [revisionSelectedLectureId, setRevisionSelectedLectureId] = useState<string>('all');
  const [revisionTag, setRevisionTag] = useState<string>('all');
  const [revisionNotes, setRevisionNotes] = useState<{ note: LectureNote; lecture?: LectureItem }[]>([]);

  // Global Search across lectures
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchTag, setGlobalSearchTag] = useState('all');
  const [searchResults, setSearchResults] = useState<{ note: LectureNote; lecture?: LectureItem }[]>([]);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSeekToTimestamp = async (seconds: number, videoUrl?: string) => {
    const ok = await LectureMarkService.seekVideo(seconds, videoUrl);
    if (ok) {
      showToast(`Jumping to ${formatSecondsToTimestamp(seconds)} in video...`);
    } else if (videoUrl) {
      window.open(buildTimestampedVideoUrl(videoUrl, seconds), '_blank');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allWithNotes = await LectureMarkService.getAllLecturesWithNotes();
      const loadedLectures = allWithNotes.map((item) => item.lecture);
      const notesMap: Record<string, LectureNote[]> = {};
      allWithNotes.forEach((item) => {
        notesMap[item.lecture.id] = item.notes;
      });
      setLectures(loadedLectures);
      setRevisionLectures(loadedLectures);
      setLectureNotesMap(notesMap);

      // Load revision notes
      const revMatches = await LectureMarkService.searchNotesAcrossLectures('', revisionTag);
      setRevisionNotes(revMatches.filter((m) => !m.note.isChapter));

      // Load search results if query is active
      if (globalSearchQuery) {
        const matches = await LectureMarkService.searchNotesAcrossLectures(globalSearchQuery, globalSearchTag);
        setSearchResults(matches);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected lecture changes in details modal
  const handleOpenLectureModal = async (lecture: LectureItem) => {
    setSelectedLecture(lecture);
    const notes = await LectureMarkService.getNotesForLecture(lecture.id);
    setSelectedLectureNotes(notes);
  };

  const handleCloseLectureModal = () => {
    setSelectedLecture(null);
    setSelectedLectureNotes([]);
  };

  // Toggle revised
  const handleToggleRevised = async (noteId: string) => {
    await LectureMarkService.toggleRevised(noteId);
    if (selectedLecture) {
      const notes = await LectureMarkService.getNotesForLecture(selectedLecture.id);
      setSelectedLectureNotes(notes);
    }
    // Update revision notes state
    setRevisionNotes((prev) =>
      prev.map((item) =>
        item.note.id === noteId ? { ...item, note: { ...item.note, isRevised: !item.note.isRevised } } : item
      )
    );
  };

  // Delete lecture
  const handleDeleteLecture = async (lectureId: string) => {
    if (window.confirm('Are you sure you want to delete this lecture and all its timestamped notes?')) {
      await LectureMarkService.deleteLecture(lectureId);
      showToast('Lecture deleted');
      if (selectedLecture?.id === lectureId) {
        handleCloseLectureModal();
      }
      loadData();
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    await LectureMarkService.deleteNote(noteId);
    if (selectedLecture) {
      const updated = await LectureMarkService.getNotesForLecture(selectedLecture.id);
      setSelectedLectureNotes(updated);
    }
    loadData();
  };

  // Export Markdown for single lecture
  const handleExportMarkdown = async (lectureId: string, title: string) => {
    const md = await LectureMarkService.exportLectureMarkdown(lectureId);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Markdown notes exported!');
  };

  // Export JSON Backup
  const handleExportJSON = async () => {
    const json = await LectureMarkService.exportAllLecturesJSON();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LectureMark_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON backup downloaded!');
  };

  // Import JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await LectureMarkService.importLecturesJSON(content);
        showToast(`Imported ${res.lecturesCount} lectures and ${res.notesCount} notes successfully!`);
        loadData();
      } catch (err: any) {
        alert(`Failed to import backup: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Revision Filtering
  useEffect(() => {
    LectureMarkService.searchNotesAcrossLectures('', revisionTag).then((matches) => {
      let filtered = matches.filter((m) => !m.note.isChapter);
      if (revisionSelectedLectureId !== 'all') {
        filtered = filtered.filter((m) => m.note.lectureId === revisionSelectedLectureId);
      }
      setRevisionNotes(filtered);
    });
  }, [revisionTag, revisionSelectedLectureId]);

  // Global Search Execution
  const handleRunGlobalSearch = async () => {
    const results = await LectureMarkService.searchNotesAcrossLectures(globalSearchQuery, globalSearchTag);
    setSearchResults(results);
  };

  // Filtered Library Lectures
  const filteredLectures = lectures.filter((l) => {
    const matchQuery =
      l.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      (l.channelName && l.channelName.toLowerCase().includes(librarySearch.toLowerCase()));
    if (!matchQuery) return false;
    if (libraryTagFilter === 'all') return true;
    return l.tags && l.tags.some((t) => t.toLowerCase() === libraryTagFilter.toLowerCase());
  });

  const totalRevisedNotes = revisionNotes.filter((n) => n.note.isRevised).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm shadow-xl flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <FilePenLine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                LectureMark
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  Dashboard
                </span>
              </h1>
              <p className="text-xs text-slate-400">Learn smarter. Remember every moment.</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 text-sm font-medium">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'library'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Lecture Library</span>
              <span className="text-xs px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 font-mono">
                {lectures.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('revision')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'revision'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Revision Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Global Search</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'backup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Export & Backup</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* ========================================================= */}
        {/* VIEW 1: LECTURE LIBRARY                                   */}
        {/* ========================================================= */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Header / Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Saved Lecture Library</h2>
                <p className="text-sm text-slate-400">
                  Every video gets its own dedicated notes, milestones, and timestamps.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search saved lectures..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
                  />
                </div>
              </div>
            </div>

            {/* Lecture Cards Grid */}
            {filteredLectures.length === 0 ? (
              <div className="text-center py-24 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 space-y-3">
                <GraduationCap className="w-12 h-12 mx-auto text-slate-600" />
                <h3 className="text-lg font-bold text-slate-200">No lectures saved in your library</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Open any YouTube educational video, NPTEL course, or HTML5 lecture. Take a timestamped note in the
                  extension popup or side panel to automatically organize it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLectures.map((lec) => {
                  const continueUrl = buildTimestampedVideoUrl(lec.videoUrl, lec.lastPositionSeconds || 0);

                  return (
                    <div
                      key={lec.id}
                      className="rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col overflow-hidden shadow-lg group"
                    >
                      {/* Video Thumbnail or Gradient Banner */}
                      <div className="h-44 bg-slate-800 relative overflow-hidden group-hover:opacity-95 transition-opacity">
                        {lec.thumbnailUrl ? (
                          <img
                            src={lec.thumbnailUrl}
                            alt={lec.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-indigo-950 via-slate-900 to-slate-800 flex items-center justify-center">
                            <BookOpen className="w-10 h-10 text-indigo-400 opacity-60" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />

                        {lec.durationSeconds && lec.durationSeconds > 0 && (
                          <span className="absolute bottom-3 right-3 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-black/80 text-white backdrop-blur">
                            {formatSecondsToTimestamp(lec.durationSeconds)}
                          </span>
                        )}

                        {lec.lastPositionSeconds && lec.lastPositionSeconds > 0 ? (
                          <span className="absolute bottom-3 left-3 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 backdrop-blur">
                            Stopped at {formatSecondsToTimestamp(lec.lastPositionSeconds)}
                          </span>
                        ) : null}
                      </div>

                      {/* Card Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <h3
                            className="text-base font-bold text-white line-clamp-2 leading-snug hover:text-indigo-300 transition-colors cursor-pointer"
                            onClick={() => handleOpenLectureModal(lec)}
                            title={lec.title}
                          >
                            {lec.title}
                          </h3>
                          {lec.channelName && (
                            <p className="text-xs font-medium text-slate-400 truncate">
                              {lec.channelName}
                            </p>
                          )}
                        </div>

                        {/* Saved Notes & Content Preview on Card */}
                        {(() => {
                          const cardNotes = lectureNotesMap[lec.id] || [];
                          if (cardNotes.length === 0) {
                            return (
                              <div className="py-2 px-3 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-[11px] text-slate-500 text-center">
                                No notes recorded yet. Take notes while playing video.
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Saved Content ({cardNotes.length})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenLectureModal(lec)}
                                  className="text-indigo-400 hover:text-indigo-300 text-[11px] hover:underline"
                                >
                                  Open full view &rarr;
                                </button>
                              </div>

                              <div className="space-y-1.5">
                                {cardNotes.slice(0, 3).map((note) => (
                                  <div
                                    key={note.id}
                                    className="flex items-start gap-2 text-xs group/item p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleSeekToTimestamp(note.timestampSeconds, lec.videoUrl)}
                                      className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                                      title="Click to jump video to this timestamp"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      {note.formattedTimestamp}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="font-semibold text-slate-200 truncate cursor-pointer hover:text-indigo-300"
                                        onClick={() => handleSeekToTimestamp(note.timestampSeconds, lec.videoUrl)}
                                        title={note.title || note.content}
                                      >
                                        {note.title || note.content}
                                      </p>
                                      {note.title && note.content && note.title !== note.content && (
                                        <p className="text-[11px] text-slate-400 line-clamp-1">
                                          {note.content}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {cardNotes.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenLectureModal(lec)}
                                    className="text-[11px] text-slate-400 hover:text-indigo-300 font-medium pt-0.5 block w-full text-left"
                                  >
                                    +{cardNotes.length - 3} more timestamped notes...
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Stats & Notes Count */}
                        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            {(() => {
                              const count = (lectureNotesMap[lec.id]?.length ?? lec.notesCount) || 0;
                              return `${count} note${count === 1 ? '' : 's'} saved`;
                            })()}
                          </span>
                          <span>
                            {new Date(lec.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSeekToTimestamp(lec.lastPositionSeconds || 0, lec.videoUrl)}
                            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-colors"
                            title="Jump to video in browser"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Continue Learning</span>
                          </button>

                          <button
                            onClick={() => handleOpenLectureModal(lec)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="View All Notes"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleExportMarkdown(lec.id, lec.title)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Export Markdown"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteLecture(lec.id)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-400 transition-colors"
                            title="Delete Lecture"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: REVISION WORKSPACE                                */}
        {/* ========================================================= */}
        {activeTab === 'revision' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Revision Workspace</h2>
                <p className="text-sm text-slate-400">
                  Active study mode. Review notes, mark as revised, and jump to specific concepts.
                </p>
              </div>

              {/* Progress metric */}
              <div className="px-4 py-2.5 rounded-xl bg-indigo-950/50 border border-indigo-900/60 flex items-center gap-4">
                <div>
                  <span className="text-xs text-indigo-300 font-semibold block">Total Progress</span>
                  <span className="text-base font-bold text-white font-mono">
                    {totalRevisedNotes} / {revisionNotes.length} revised
                  </span>
                </div>
                <div className="w-24 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{
                      width: `${revisionNotes.length ? (totalRevisedNotes / revisionNotes.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter By Tag:</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setRevisionTag('all')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                    revisionTag === 'all'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Tags
                </button>
                {PRESET_TAGS.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setRevisionTag(tag)}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                      revisionTag === tag
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Lecture:</span>
                <select
                  value={revisionSelectedLectureId}
                  onChange={(e) => setRevisionSelectedLectureId(e.target.value)}
                  className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Lectures ({lectures.length})</option>
                  {lectures.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title.length > 35 ? l.title.substring(0, 35) + '...' : l.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Revision Cards */}
            {revisionNotes.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-dashed border-slate-800 text-slate-500 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600" />
                <h3 className="text-base font-bold text-slate-300">No revision notes found</h3>
                <p className="text-xs text-slate-500">
                  Save notes tagged with Exam, Doubt, or Important to build your revision queue.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {revisionNotes.map(({ note, lecture }) => {
                  const jumpUrl = lecture
                    ? buildTimestampedVideoUrl(lecture.videoUrl, note.timestampSeconds)
                    : '#';

                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        note.isRevised
                          ? 'bg-slate-900/40 border-slate-800/80 opacity-60'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleSeekToTimestamp(note.timestampSeconds, lecture?.videoUrl)}
                            className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/70 text-indigo-300 hover:bg-indigo-600 hover:text-white flex items-center gap-1 transition-colors"
                            title="Jump video to this timestamp"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            {note.formattedTimestamp}
                          </button>

                          {lecture && (
                            <span className="text-xs font-medium text-slate-400">
                              in <span className="text-slate-300 font-semibold">{lecture.title}</span>
                            </span>
                          )}

                          {note.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10.5px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-medium"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>

                        {note.title && (
                          <h4 className="text-sm font-bold text-slate-100">{note.title}</h4>
                        )}

                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-w-3xl">
                          {note.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSeekToTimestamp(note.timestampSeconds, lecture?.videoUrl)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Jump video to this timestamp"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Jump to Video</span>
                        </button>

                        <button
                          onClick={() => handleToggleRevised(note.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            note.isRevised
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                          }`}
                        >
                          {note.isRevised ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Revised</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4" />
                              <span>Mark Revised</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: GLOBAL SEARCH ACROSS ALL LECTURES                 */}
        {/* ========================================================= */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Search Across Lectures</h2>
              <p className="text-sm text-slate-400">
                Search concepts across every saved lecture to prepare for university examinations.
              </p>
            </div>

            {/* Search Input Bar */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900 border border-slate-800">
              <Search className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
              <input
                type="text"
                placeholder="Search across all lectures (e.g. deadlock, context switch, gradient descent)..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunGlobalSearch();
                }}
                className="flex-1 bg-transparent border-0 text-sm text-white placeholder-slate-500 focus:outline-none"
              />

              <button
                onClick={handleRunGlobalSearch}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Search
              </button>
            </div>

            {/* Results */}
            <div className="space-y-3">
              {searchResults.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  {globalSearchQuery
                    ? `No notes matching "${globalSearchQuery}".`
                    : 'Type a query above to search through all timestamped lecture notes.'}
                </div>
              ) : (
                searchResults.map(({ note, lecture }) => {
                  const url = lecture ? buildTimestampedVideoUrl(lecture.videoUrl, note.timestampSeconds) : '#';

                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSeekToTimestamp(note.timestampSeconds, lecture?.videoUrl)}
                            className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-1 shadow-sm"
                            title="Jump video to this timestamp"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            {note.formattedTimestamp}
                          </button>
                          {lecture && (
                            <span className="text-xs font-semibold text-slate-300">
                              {lecture.title}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSeekToTimestamp(note.timestampSeconds, lecture?.videoUrl)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                          title="Jump video to this timestamp"
                        >
                          <span>Jump in video</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {note.title && (
                        <h4 className="text-xs font-bold text-white">{note.title}</h4>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed">{note.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: EXPORT & BACKUP                                   */}
        {/* ========================================================= */}
        {activeTab === 'backup' && (
          <div className="max-w-2xl mx-auto space-y-8 py-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Export & Data Portability</h2>
              <p className="text-sm text-slate-400">
                You own your study notes. Export to clean Markdown documents or full JSON backups.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-900/50 text-indigo-300 flex items-center justify-center font-bold">
                    <Download className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Full JSON Backup</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Download all saved lectures, notes, chapters, and revision history into a single portable JSON file.
                  </p>
                </div>

                <button
                  onClick={handleExportJSON}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup</span>
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-300 flex items-center justify-center font-bold">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Restore Backup</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Import previously exported LectureMark JSON backups into this browser.
                  </p>
                </div>

                <label className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Select JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: LECTURE DETAILS & FULL NOTES DRAWER                */}
      {/* ========================================================= */}
      {selectedLecture && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">{selectedLecture.title}</h3>
                {selectedLecture.channelName && (
                  <p className="text-xs text-slate-400">{selectedLecture.channelName}</p>
                )}
                <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                  <span>{selectedLectureNotes.length} notes</span>
                  <span>•</span>
                  <a
                    href={selectedLecture.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Watch Video <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportMarkdown(selectedLecture.id, selectedLecture.title)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .md</span>
                </button>
                <button
                  onClick={handleCloseLectureModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {selectedLectureNotes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No timestamped notes recorded for this lecture yet.
                </div>
              ) : (
                selectedLectureNotes.map((note) => {
                  const jumpUrl = buildTimestampedVideoUrl(selectedLecture.videoUrl, note.timestampSeconds);

                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSeekToTimestamp(note.timestampSeconds, selectedLecture.videoUrl)}
                            className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-1 shadow-sm"
                            title="Jump video to this timestamp"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            {note.formattedTimestamp}
                          </button>
                          {note.title && (
                            <h4 className="text-xs font-bold text-white">{note.title}</h4>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleRevised(note.id)}
                            className="text-slate-400 hover:text-emerald-400"
                            title="Toggle revised"
                          >
                            {note.isRevised ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-slate-500 hover:text-red-400 p-0.5"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>

                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {note.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 font-medium"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
