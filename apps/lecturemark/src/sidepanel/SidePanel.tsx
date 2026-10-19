import React, { useEffect, useState } from 'react';
import {
  ActiveVideoPlaybackState,
  LectureItem,
  LectureNote,
} from '@nexora/shared-types';
import { LectureMarkService } from '../services/lecturemark';
import { formatSecondsToTimestamp } from '@nexora/browser-utils';
import {
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  ExternalLink,
  BookOpen,
  ListOrdered,
  Plus,
  Maximize2,
  RotateCcw,
  Download,
  Share2,
  FilePenLine,
} from 'lucide-react';

const PRESET_TAGS = ['Exam', 'Doubt', 'Important', 'Assignment', 'Chapter'];

export const SidePanel: React.FC = () => {
  const [activeVideo, setActiveVideo] = useState<ActiveVideoPlaybackState | null>(null);
  const [currentLecture, setCurrentLecture] = useState<LectureItem | null>(null);
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Important']);
  const [noteTimestamp, setNoteTimestamp] = useState<number>(0);
  const [isTimestampPinned, setIsTimestampPinned] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'chapters' | 'revision'>('notes');
  const [revisionTagFilter, setRevisionTagFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const refreshState = async () => {
    try {
      const state = await LectureMarkService.getActivePlaybackState();
      setActiveVideo(state);
      if (!isTimestampPinned && !noteTitle && !noteContent) {
        setNoteTimestamp(state.currentTime);
      }

      if (state.hasVideo && state.videoUrl) {
        const lecture = await LectureMarkService.findOrCreateLectureForUrl(
          state.videoUrl,
          state.title,
          state.videoId,
          state.channelName,
          state.duration
        );
        setCurrentLecture(lecture);
        const savedNotes = await LectureMarkService.getNotesForLecture(lecture.id);
        setNotes(savedNotes);
      } else {
        setCurrentLecture(null);
        setNotes([]);
      }
    } catch (err) {
      console.error('Error refreshing side panel state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(async () => {
      try {
        const state = await LectureMarkService.getActivePlaybackState();
        setActiveVideo(state);

        if (state.hasVideo) {
          if (!isTimestampPinned && !noteTitle && !noteContent) {
            setNoteTimestamp(state.currentTime);
          }

          if (!currentLecture || (state.videoUrl && currentLecture.videoUrl !== state.videoUrl)) {
            const lecture = await LectureMarkService.findOrCreateLectureForUrl(
              state.videoUrl,
              state.title,
              state.videoId,
              state.channelName,
              state.duration
            );
            setCurrentLecture(lecture);
            const savedNotes = await LectureMarkService.getNotesForLecture(lecture.id);
            setNotes(savedNotes);
          } else if (state.duration > 0 && (!currentLecture.durationSeconds || currentLecture.durationSeconds === 0)) {
            currentLecture.durationSeconds = state.duration;
            await LectureMarkService.saveLecture(currentLecture);
          }
        }
      } catch (err) {
        // ignore polling error
      }
    }, 600);
    return () => clearInterval(interval);
  }, [currentLecture, isTimestampPinned, noteTitle, noteContent]);

  const handleCaptureCurrentTime = () => {
    if (activeVideo) {
      setNoteTimestamp(activeVideo.currentTime);
      setIsTimestampPinned(true);
    }
  };

  const handleResetToLive = () => {
    if (activeVideo) {
      setNoteTimestamp(activeVideo.currentTime);
      setIsTimestampPinned(false);
    }
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSaveNote = async (isChapterMarker = false) => {
    if (!currentLecture) return;
    const content = noteContent.trim();
    const title = noteTitle.trim();

    if (!content && !title) return;

    setIsSubmitting(true);
    try {
      const isChapter = isChapterMarker || selectedTags.includes('Chapter');
      const newNote: LectureNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lectureId: currentLecture.id,
        timestampSeconds: noteTimestamp,
        formattedTimestamp: formatSecondsToTimestamp(noteTimestamp),
        title: title || (isChapter ? 'Chapter' : 'Note'),
        content: content || title,
        tags: isChapter && !selectedTags.includes('Chapter') ? [...selectedTags, 'Chapter'] : selectedTags,
        isChapter,
        isRevised: false,
      };

      await LectureMarkService.saveNote(newNote);
      setNoteTitle('');
      setNoteContent('');
      setIsTimestampPinned(false);
      if (activeVideo) {
        setNoteTimestamp(activeVideo.currentTime);
      }

      const updated = await LectureMarkService.getNotesForLecture(currentLecture.id);
      setNotes(updated);
    } catch (err) {
      console.error('Failed to save note in side panel:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeek = async (seconds: number) => {
    await LectureMarkService.seekVideo(seconds, currentLecture?.videoUrl);
    setNoteTimestamp(seconds);
    if (activeVideo) {
      setActiveVideo({
        ...activeVideo,
        currentTime: seconds,
        formattedCurrentTime: formatSecondsToTimestamp(seconds),
      });
    }
  };

  const handleToggleRevised = async (noteId: string) => {
    await LectureMarkService.toggleRevised(noteId);
    if (currentLecture) {
      const updated = await LectureMarkService.getNotesForLecture(currentLecture.id);
      setNotes(updated);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await LectureMarkService.deleteNote(noteId);
    if (currentLecture) {
      const updated = await LectureMarkService.getNotesForLecture(currentLecture.id);
      setNotes(updated);
    }
  };

  const handleExportMarkdown = async () => {
    if (!currentLecture) return;
    const md = await LectureMarkService.exportLectureMarkdown(currentLecture.id);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentLecture.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    setCopyFeedback('Markdown downloaded!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    } else {
      window.open('dashboard.html', '_blank');
    }
  };

  const chapters = notes.filter((n) => n.isChapter || n.tags.includes('Chapter'));
  const standardNotes = notes.filter((n) => !n.isChapter && !n.tags.includes('Chapter'));
  const revisedCount = standardNotes.filter((n) => n.isRevised).length;
  const filteredRevisionNotes = standardNotes.filter((n) => {
    if (revisionTagFilter === 'all') return true;
    return n.tags.some((t) => t.toLowerCase() === revisionTagFilter.toLowerCase());
  });

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 text-slate-100 font-sans select-none overflow-hidden">
      {/* Side Panel Header */}
      <header className="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow">
            <FilePenLine className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              LectureMark
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                Side Panel
              </span>
            </h1>
            <p className="text-[10.5px] text-slate-400">Timestamped notes & chapters</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={openDashboard}
            title="Open Fullscreen Library"
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Video Bar Indicator */}
      {activeVideo?.hasVideo ? (
        <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="truncate">
              <span className="truncate font-semibold text-slate-200 block" title={activeVideo.title}>
                {activeVideo.title}
              </span>
              {activeVideo.channelName && (
                <span className="text-[10.5px] text-slate-400 block truncate">
                  {activeVideo.channelName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => LectureMarkService.togglePlayPause()}
              className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              title="Play/Pause Video"
            >
              {activeVideo.paused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-2.5 py-0.5 rounded">
              {activeVideo.formattedCurrentTime}
              {activeVideo.duration > 0 ? ` / ${activeVideo.formattedDuration}` : ''}
            </span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-800/30 text-amber-300 text-xs flex items-center gap-2 shrink-0">
          <Clock className="w-4 h-4 shrink-0" />
          <span>No active video detected. Open a YouTube lecture to take notes.</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/80 px-4 text-xs font-medium shrink-0">
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'notes'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Notes ({standardNotes.length})
        </button>
        <button
          onClick={() => setActiveTab('chapters')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'chapters'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          Chapters ({chapters.length})
        </button>
        <button
          onClick={() => setActiveTab('revision')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'revision'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Revision ({revisedCount}/{standardNotes.length})
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: NOTES COMPOSER */}
        {activeTab === 'notes' && (
          <>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isTimestampPinned ? handleResetToLive : handleCaptureCurrentTime}
                    className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-md transition-colors ${
                      isTimestampPinned
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-700/70 hover:bg-amber-900/80'
                        : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-900/90'
                    }`}
                    title={isTimestampPinned ? 'Click to unpin and resume live tracking' : 'Click to pin timestamp'}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatSecondsToTimestamp(noteTimestamp)}</span>
                    {isTimestampPinned ? (
                      <span className="text-[10px] text-amber-400 ml-0.5 font-sans font-normal">📌 Pinned</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                    )}
                  </button>

                  {isTimestampPinned && activeVideo && activeVideo.currentTime !== noteTimestamp && (
                    <button
                      type="button"
                      onClick={() => setNoteTimestamp(activeVideo.currentTime)}
                      className="text-[10.5px] text-indigo-400 hover:text-indigo-200 underline font-mono"
                      title="Sync to current video position"
                    >
                      Sync Now ({activeVideo.formattedCurrentTime})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {PRESET_TAGS.slice(0, 4).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToggleTag(t)}
                      className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                        selectedTags.includes(t)
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'bg-slate-700/70 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="Topic or concept title..."
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  if (!isTimestampPinned && e.target.value) {
                    setIsTimestampPinned(true);
                  }
                }}
                className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <textarea
                placeholder="Take a note, write an exam question, or paste code snippet... (Press Ctrl+Enter to save)"
                rows={3}
                value={noteContent}
                onChange={(e) => {
                  setNoteContent(e.target.value);
                  if (!isTimestampPinned && e.target.value) {
                    setIsTimestampPinned(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSaveNote(false);
                  }
                }}
                className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveNote(true)}
                  disabled={!currentLecture || (!noteTitle && !noteContent)}
                  className="text-xs text-slate-400 hover:text-slate-200 hover:underline disabled:opacity-40"
                >
                  + Add as Chapter
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveNote(false)}
                  disabled={!currentLecture || (!noteTitle && !noteContent) || isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save at {formatSecondsToTimestamp(noteTimestamp)}
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span className="uppercase tracking-wider text-[11px]">Saved Notes</span>
                {currentLecture && (
                  <button
                    onClick={handleExportMarkdown}
                    className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                    title="Export notes as Markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export .md</span>
                  </button>
                )}
              </div>

              {copyFeedback && (
                <div className="p-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-lg text-center font-medium">
                  {copyFeedback}
                </div>
              )}

              {standardNotes.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-2">
                  <BookOpen className="w-7 h-7 mx-auto text-slate-600" />
                  <p className="text-xs font-medium text-slate-300">No notes recorded yet</p>
                  <p className="text-[11.5px] text-slate-500 max-w-xs mx-auto">
                    Take timestamped notes while watching your lecture. They will be organized automatically.
                  </p>
                </div>
              ) : (
                standardNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-500 transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleSeek(note.timestampSeconds)}
                        className="flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/70 text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors shrink-0"
                        title="Jump to video timestamp"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        {note.formattedTimestamp}
                      </button>

                      <div className="flex-1 min-w-0">
                        {note.title && (
                          <h3
                            className="text-xs font-bold text-slate-200 truncate cursor-pointer hover:text-indigo-300 transition-colors"
                            onClick={() => handleSeek(note.timestampSeconds)}
                            title="Click to jump to this timestamp in video"
                          >
                            {note.title}
                          </h3>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleRevised(note.id)}
                          className="text-slate-400 hover:text-emerald-400 p-0.5"
                          title={note.isRevised ? 'Mark as unrevised' : 'Mark as revised'}
                        >
                          {note.isRevised ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Delete note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-normal">
                      {note.content}
                    </p>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* TAB 2: CHAPTERS */}
        {activeTab === 'chapters' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2.5">
              <h3 className="text-xs font-bold text-slate-200">Add Chapter Milestone</h3>
              <p className="text-[11.5px] text-slate-400">
                Mark lecture milestones so you can jump to specific concepts instantly.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Chapter name (e.g. Worked Example)..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleSaveNote(true)}
                  disabled={!currentLecture || !noteTitle}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
                >
                  Save Chapter
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {chapters.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No chapters created for this lecture yet.
                </div>
              ) : (
                chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleSeek(ch.timestampSeconds)}
                        className="font-mono text-xs font-bold px-2 py-1 rounded bg-indigo-900/80 text-indigo-300 hover:bg-indigo-800"
                      >
                        {ch.formattedTimestamp}
                      </button>
                      <span
                        className="text-xs font-semibold text-slate-200 cursor-pointer hover:text-indigo-300 transition-colors"
                        onClick={() => handleSeek(ch.timestampSeconds)}
                        title="Click to jump to this chapter in video"
                      >
                        {ch.title || ch.content}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteNote(ch.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: REVISION WORKSPACE */}
        {activeTab === 'revision' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-900/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-indigo-300">Revision Checklist</span>
                <span className="text-white">
                  {revisedCount} of {standardNotes.length} completed
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{
                    width: `${standardNotes.length ? (revisedCount / standardNotes.length) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setRevisionTagFilter('all')}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full ${
                    revisionTagFilter === 'all'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({standardNotes.length})
                </button>
                {PRESET_TAGS.slice(0, 4).map((tag) => {
                  const count = standardNotes.filter((n) =>
                    n.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
                  ).length;
                  return (
                    <button
                      key={tag}
                      onClick={() => setRevisionTagFilter(tag)}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full ${
                        revisionTagFilter === tag
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tag} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredRevisionNotes.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No notes found matching the selected filter.
                </div>
              ) : (
                filteredRevisionNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-xl border transition-all ${
                      note.isRevised
                        ? 'bg-slate-800/30 border-slate-800 opacity-60'
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleSeek(note.timestampSeconds)}
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300"
                      >
                        ▶ {note.formattedTimestamp}
                      </button>
                      <h4 className="text-xs font-semibold text-slate-200 flex-1">
                        {note.title || 'Revision Item'}
                      </h4>
                      <button
                        onClick={() => handleToggleRevised(note.id)}
                        className="text-slate-300 hover:text-emerald-400"
                      >
                        {note.isRevised ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Side Panel Footer */}
      <footer className="px-4 py-2.5 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <button
          onClick={openDashboard}
          className="hover:text-indigo-300 flex items-center gap-1.5 transition-colors font-medium"
        >
          <BookOpen className="w-4 h-4" />
          <span>Full Library & Revision</span>
        </button>
        <span className="text-[11px] text-slate-500">LectureMark</span>
      </footer>
    </div>
  );
};
