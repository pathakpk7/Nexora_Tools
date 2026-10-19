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
  Bookmark,
  CheckCircle2,
  Circle,
  Trash2,
  ExternalLink,
  Search,
  BookOpen,
  ListOrdered,
  Plus,
  Tag,
  Maximize2,
  Sidebar,
  RotateCcw,
  Sparkles,
  FilePenLine,
} from 'lucide-react';

const PRESET_TAGS = ['Exam', 'Doubt', 'Important', 'Assignment', 'Chapter'];

export const Popup: React.FC = () => {
  const [activeVideo, setActiveVideo] = useState<ActiveVideoPlaybackState | null>(null);
  const [currentLecture, setCurrentLecture] = useState<LectureItem | null>(null);
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Important']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [noteTimestamp, setNoteTimestamp] = useState<number>(0);
  const [isTimestampPinned, setIsTimestampPinned] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'chapters' | 'revision'>('notes');
  const [revisionTagFilter, setRevisionTagFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load video state & current lecture notes
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
      console.error('Error refreshing video state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
    // Poll video state frequently to keep current position and video duration completely live
    const interval = setInterval(async () => {
      try {
        const state = await LectureMarkService.getActivePlaybackState();
        setActiveVideo(state);

        if (state.hasVideo) {
          // If not currently typing and not manually pinned, live-track note timestamp
          if (!isTimestampPinned && !noteTitle && !noteContent) {
            setNoteTimestamp(state.currentTime);
          }

          // If user navigated to a different video URL (e.g. YouTube SPA navigation), switch lecture
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

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setCustomTagInput('');
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
      if (activeVideo) {
        setNoteTimestamp(activeVideo.currentTime);
      }

      const updated = await LectureMarkService.getNotesForLecture(currentLecture.id);
      setNotes(updated);
    } catch (err) {
      console.error('Failed to save note:', err);
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

  const openSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.sidePanel.open({ tabId: tabs[0].id }).catch(() => {
            window.open(chrome.runtime.getURL('sidepanel.html'), '_blank');
          });
        }
      });
    } else {
      window.open(chrome.runtime.getURL('sidepanel.html'), '_blank');
    }
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
    <div className="w-[420px] h-[580px] flex flex-col bg-slate-900 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <header className="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <FilePenLine className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 leading-none">
              LectureMark
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                PRO
              </span>
            </h1>
            <p className="text-[10.5px] text-slate-400 font-medium">Learn smarter. Remember every moment.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={openSidePanel}
            title="Open Video Side Panel"
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <Sidebar className="w-4 h-4" />
          </button>
          <button
            onClick={openDashboard}
            title="Open Lecture Library & Revision Workspace"
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Video Bar Indicator */}
      {activeVideo?.hasVideo ? (
        <div className="px-3.5 py-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="truncate">
              <span className="truncate font-semibold text-slate-200 block" title={activeVideo.title}>
                {activeVideo.title}
              </span>
              {activeVideo.channelName && (
                <span className="text-[10px] text-slate-400 block truncate">
                  {activeVideo.channelName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => LectureMarkService.togglePlayPause()}
              className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              title="Play/Pause Video"
            >
              {activeVideo.paused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
            </button>
            <span className="font-mono text-[11px] font-semibold text-indigo-300 bg-indigo-950/70 border border-indigo-800/50 px-2 py-0.5 rounded">
              {activeVideo.formattedCurrentTime}
              {activeVideo.duration > 0 ? ` / ${activeVideo.formattedDuration}` : ''}
            </span>
          </div>
        </div>
      ) : (
        <div className="px-3 py-1.5 bg-amber-950/40 border-b border-amber-800/30 text-amber-300 text-[11.5px] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">No active video detected. Open a YouTube lecture to begin.</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/60 px-3 text-xs font-medium">
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'notes'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Notes ({standardNotes.length})
        </button>
        <button
          onClick={() => setActiveTab('chapters')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'chapters'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          Chapters ({chapters.length})
        </button>
        <button
          onClick={() => setActiveTab('revision')}
          className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'revision'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Revision ({revisedCount}/{standardNotes.length})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: NOTES & COMPOSER */}
        {activeTab === 'notes' && (
          <>
            {/* Note Composer Box */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={isTimestampPinned ? handleResetToLive : handleCaptureCurrentTime}
                    className={`flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-1 rounded transition-colors ${
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
                      className="text-[10px] text-indigo-400 hover:text-indigo-200 underline font-mono"
                      title="Sync to current playback position"
                    >
                      Sync Now ({activeVideo.formattedCurrentTime})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {PRESET_TAGS.slice(0, 4).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToggleTag(t)}
                      className={`text-[10.5px] px-2 py-0.5 rounded-full transition-colors ${
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
                placeholder="Note title or key question (optional)..."
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  if (!isTimestampPinned && e.target.value) {
                    setIsTimestampPinned(true);
                  }
                }}
                className="w-full text-xs bg-slate-900/90 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <textarea
                placeholder="Write explanation, formula, code snippet, or doubt..."
                rows={2}
                value={noteContent}
                onChange={(e) => {
                  setNoteContent(e.target.value);
                  if (!isTimestampPinned && e.target.value) {
                    setIsTimestampPinned(true);
                  }
                }}
                className="w-full text-xs bg-slate-900/90 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveNote(true)}
                  disabled={!currentLecture || (!noteTitle && !noteContent)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline disabled:opacity-40"
                >
                  + Add as Chapter
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveNote(false)}
                  disabled={!currentLecture || (!noteTitle && !noteContent) || isSubmitting}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save Note at {formatSecondsToTimestamp(noteTimestamp)}
                </button>
              </div>
            </div>

            {/* Saved Notes List */}
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Lecture Notes</span>
                <span>{standardNotes.length} notes</span>
              </h2>

              {standardNotes.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-lg border border-dashed border-slate-800 text-slate-500 space-y-1.5">
                  <BookOpen className="w-6 h-6 mx-auto text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">No notes saved for this lecture yet</p>
                  <p className="text-[11px] text-slate-500">
                    Play the video and take a timestamped note above.
                  </p>
                </div>
              ) : (
                standardNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all space-y-1.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleSeek(note.timestampSeconds)}
                        className="flex items-center gap-1 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors shrink-0"
                        title="Jump to video timestamp"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        {note.formattedTimestamp}
                      </button>

                      <div className="flex-1 min-w-0">
                        {note.title && (
                          <h3
                            className="text-xs font-semibold text-slate-200 truncate cursor-pointer hover:text-indigo-300 transition-colors"
                            onClick={() => handleSeek(note.timestampSeconds)}
                            title="Click to jump to this timestamp in video"
                          >
                            {note.title}
                          </h3>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleRevised(note.id)}
                          className="text-slate-400 hover:text-emerald-400 p-0.5"
                          title={note.isRevised ? 'Mark as unrevised' : 'Mark as revised'}
                        >
                          {note.isRevised ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Circle className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700/70 text-slate-300 font-medium"
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

        {/* TAB 2: CHAPTER MARKERS */}
        {activeTab === 'chapters' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg space-y-2">
              <h3 className="text-xs font-bold text-slate-200">Add Chapter Marker</h3>
              <p className="text-[11px] text-slate-400">
                Create structured lecture chapters to break down concepts.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Chapter title (e.g. Worked Example)..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleSaveNote(true)}
                  disabled={!currentLecture || !noteTitle}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold disabled:opacity-40"
                >
                  Save at {formatSecondsToTimestamp(noteTimestamp)}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {chapters.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No chapter markers added yet. Add chapter milestones while watching.
                </div>
              ) : (
                chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSeek(ch.timestampSeconds)}
                        className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 hover:bg-indigo-800"
                      >
                        {ch.formattedTimestamp}
                      </button>
                      <span
                        className="text-xs font-medium text-slate-200 cursor-pointer hover:text-indigo-300 transition-colors"
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
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: REVISION WORKSPACE */}
        {activeTab === 'revision' && (
          <div className="space-y-3">
            {/* Revision Progress Header */}
            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-300">Revision Progress</span>
                <span className="text-white">
                  {revisedCount} / {standardNotes.length} revised
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{
                    width: `${standardNotes.length ? (revisedCount / standardNotes.length) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* Tag Filter Pills */}
              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  onClick={() => setRevisionTagFilter('all')}
                  className={`text-[10.5px] px-2 py-0.5 rounded ${
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
                      className={`text-[10.5px] px-2 py-0.5 rounded ${
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

            {/* Filtered Notes for Revision */}
            <div className="space-y-2">
              {filteredRevisionNotes.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No notes match the selected revision filter.
                </div>
              ) : (
                filteredRevisionNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      note.isRevised
                        ? 'bg-slate-800/30 border-slate-800 opacity-60'
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleSeek(note.timestampSeconds)}
                        className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300"
                      >
                        ▶ {note.formattedTimestamp}
                      </button>
                      <h4 className="text-xs font-semibold text-slate-200 flex-1">
                        {note.title || 'Revision Point'}
                      </h4>
                      <button
                        onClick={() => handleToggleRevised(note.id)}
                        className="text-slate-300 hover:text-emerald-400"
                      >
                        {note.isRevised ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-3 py-2 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
        <button
          onClick={openDashboard}
          className="hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Lecture Library</span>
        </button>
        <span className="text-[11px] text-slate-500">Nexora Tools</span>
      </footer>
    </div>
  );
};
