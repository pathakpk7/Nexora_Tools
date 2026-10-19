import {
  LectureItem,
  LectureNote,
  ActiveVideoPlaybackState,
} from '@nexora/shared-types';
import { LocalIndexedDB } from '@nexora/storage';
import {
  formatSecondsToTimestamp,
  buildTimestampedVideoUrl,
  extractYoutubeVideoId,
} from '@nexora/browser-utils';

const lectureDb = new LocalIndexedDB<LectureItem>('LectureMarkDB', 'lectures', 1);
const noteDb = new LocalIndexedDB<LectureNote>('LectureMarkDB_Notes', 'notes', 1);

export class LectureMarkService {
  // -------------------------
  // Video Communication & Active State
  // -------------------------

  /**
   * Robust tab finder that reliably finds the active video tab whether LectureMark
   * is opened in the extension popup, sidepanel, or another window.
   */
  static async getBestActiveVideoTab(): Promise<chrome.tabs.Tab | null> {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      return null;
    }

    try {
      // 1. Try active tab in current window
      const [currTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (currTab && currTab.url && !currTab.url.startsWith('chrome-extension://')) {
        return currTab;
      }

      // 2. Try active tab in last focused window (especially useful for side panels and popup dialogs)
      const [lastTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (lastTab && lastTab.url && !lastTab.url.startsWith('chrome-extension://')) {
        return lastTab;
      }

      // 3. Search for any open YouTube / educational video tabs
      const ytTabs = await chrome.tabs.query({
        url: ['*://*.youtube.com/*', '*://youtu.be/*'],
      });
      if (ytTabs && ytTabs.length > 0) {
        const activeYt = ytTabs.find((t) => t.active) || ytTabs[0];
        return activeYt || null;
      }

      // 4. Fallback: check all open tabs across windows
      const allTabs = await chrome.tabs.query({});
      const best = allTabs.find((t) => t.active && t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://')) ||
                   allTabs.find((t) => t.url && (t.url.includes('youtube.com') || t.url.includes('youtu.be'))) ||
                   currTab;
      return best || null;
    } catch (err) {
      console.warn('[LectureMark] Tab lookup error:', err);
      return null;
    }
  }

  static async getActivePlaybackState(): Promise<ActiveVideoPlaybackState> {
    const emptyState: ActiveVideoPlaybackState = {
      hasVideo: false,
      videoUrl: '',
      videoId: '',
      title: '',
      channelName: '',
      currentTime: 0,
      duration: 0,
      formattedCurrentTime: '00:00',
      formattedDuration: '00:00',
      paused: true,
    };

    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      return emptyState;
    }

    try {
      const tab = await this.getBestActiveVideoTab();
      if (!tab || !tab.id) {
        return emptyState;
      }

      // Tier 1: Try content script messaging
      let msgResponse: ActiveVideoPlaybackState | null = null;
      try {
        msgResponse = await new Promise<ActiveVideoPlaybackState | null>((resolve) => {
          chrome.tabs.sendMessage(tab.id!, { action: 'GET_VIDEO_STATE' }, (resp) => {
            if (chrome.runtime.lastError || !resp) {
              resolve(null);
            } else {
              resolve(resp);
            }
          });
        });
      } catch {
        msgResponse = null;
      }

      if (msgResponse && msgResponse.hasVideo) {
        return msgResponse;
      }

      // Tier 2: Direct on-page execution via chrome.scripting (works across existing tabs without refresh)
      if (chrome.scripting && chrome.scripting.executeScript) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              function parseTimeStr(str: string): number {
                if (!str) return 0;
                const cleaned = str.trim().replace(/[^\d:]/g, '');
                const parts = cleaned.split(':').map((p) => parseInt(p, 10));
                if (parts.some(isNaN)) return 0;
                if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
                if (parts.length === 2) return parts[0] * 60 + parts[1];
                return parts[0] || 0;
              }

              let cur: number | null = null;
              let dur: number | null = null;
              let isPaused: boolean = true;

              // 1. Primary: HTML5 video element (real-time hardware clock)
              const ytVideo = document.querySelector<HTMLVideoElement>('#movie_player video.html5-main-video') ||
                              document.querySelector<HTMLVideoElement>('video.html5-main-video') ||
                              document.querySelector<HTMLVideoElement>('#movie_player video') ||
                              document.querySelector<HTMLVideoElement>('video');

              if (ytVideo) {
                if (!isNaN(ytVideo.currentTime)) {
                  cur = Math.floor(ytVideo.currentTime);
                }
                if (!isNaN(ytVideo.duration) && ytVideo.duration > 0) {
                  dur = Math.floor(ytVideo.duration);
                }
                isPaused = ytVideo.paused;
              }

              // 2. YouTube DOM time indicators as fallback
              const curElem = document.querySelector('.ytp-time-current');
              const durElem = document.querySelector('.ytp-time-duration');
              if ((cur === null || isNaN(cur) || cur === 0) && curElem?.textContent) {
                const p = parseTimeStr(curElem.textContent);
                if (!isNaN(p) && p > 0) cur = p;
              }
              if ((dur === null || isNaN(dur) || dur === 0) && durElem?.textContent) {
                const p = parseTimeStr(durElem.textContent);
                if (!isNaN(p) && p > 0) dur = p;
              }

              // 3. YouTube play button indicator for paused state
              const playBtn = document.querySelector('.ytp-play-button');
              if (playBtn && isPaused) {
                const label = playBtn.getAttribute('title') || playBtn.getAttribute('aria-label') || '';
                if (label.toLowerCase().includes('pause')) isPaused = false;
                else if (label.toLowerCase().includes('play')) isPaused = true;
              }

              // 4. Video title & Channel
              let title = document.title || 'Video Lecture';
              const ytTitleElem = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, ytd-watch-metadata h1, #container h1.title, #title h1');
              if (ytTitleElem?.textContent?.trim()) {
                title = ytTitleElem.textContent.trim();
              } else {
                title = title.replace(/ - YouTube$/, '').trim();
              }

              const ytChannelElem = document.querySelector('#channel-name #text, ytd-channel-name a, #owner-name a, #upload-info #text, #channel-name a');
              const channelName = ytChannelElem?.textContent?.trim() ||
                document.querySelector('meta[itemprop="name"]')?.getAttribute('content') ||
                window.location.hostname.replace(/^www\./, '');

              const isYt = window.location.href.includes('youtube.com') || window.location.href.includes('youtu.be');
              const isWatch = isYt && (
                window.location.href.includes('/watch') ||
                window.location.href.includes('/live/') ||
                window.location.href.includes('/shorts/') ||
                window.location.href.includes('youtu.be')
              );

              return {
                hasVideo: isWatch || Boolean(ytVideo) || (cur !== null && cur >= 0),
                videoUrl: window.location.href,
                title,
                channelName,
                currentTime: Math.max(0, cur || 0),
                duration: Math.max(0, dur || 0),
                paused: isPaused,
              };
            },
          });

          if (results && results[0] && results[0].result) {
            const r = results[0].result;
            // Background inject content.js if missing
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});

            return {
              hasVideo: r.hasVideo,
              videoUrl: r.videoUrl,
              videoId: extractYoutubeVideoId(r.videoUrl) || '',
              title: r.title,
              channelName: r.channelName,
              currentTime: r.currentTime,
              duration: r.duration,
              formattedCurrentTime: formatSecondsToTimestamp(r.currentTime),
              formattedDuration: formatSecondsToTimestamp(r.duration),
              paused: r.paused,
            };
          }
        } catch (err) {
          console.warn('[LectureMark] Direct scripting fallback encountered:', err);
        }
      }

      // If content script returned state
      if (msgResponse && msgResponse.hasVideo) {
        return msgResponse;
      }

      // Fallback from tab metadata
      const url = tab.url || '';
      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
      const isVideoPage = isYoutube && (url.includes('/watch') || url.includes('/live/') || url.includes('/shorts/') || url.includes('youtu.be'));
      return {
        hasVideo: isVideoPage || isYoutube,
        videoUrl: url,
        videoId: extractYoutubeVideoId(url) || '',
        title: tab.title?.replace(/ - YouTube$/, '') || 'Video Lecture',
        channelName: isYoutube ? 'YouTube' : '',
        currentTime: 0,
        duration: 0,
        formattedCurrentTime: '00:00',
        formattedDuration: '00:00',
        paused: true,
      };
    } catch (err) {
      console.error('[LectureMark] Error fetching playback state:', err);
      return emptyState;
    }
  }

  static async seekVideo(timestampSeconds: number, targetUrl?: string): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      return false;
    }

    try {
      const tab = await this.getBestActiveVideoTab();
      if (tab && tab.id) {
        const targetVideoId = extractYoutubeVideoId(targetUrl);
        const tabVideoId = extractYoutubeVideoId(tab.url);
        const isSameVideo =
          !targetUrl ||
          (Boolean(targetVideoId) && Boolean(tabVideoId) && targetVideoId === tabVideoId) ||
          Boolean(tab.url && (tab.url === targetUrl || targetUrl.includes(tab.url) || tab.url.includes(targetUrl)));

        if (isSameVideo) {
          // 1. Bring tab and its window into active focus so user immediately sees the jump
          chrome.tabs.update(tab.id, { active: true }).catch(() => {});
          if (tab.windowId) {
            chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
          }

          // 2. High-priority Tier: execute directly in YouTube main page world (accesses native player seekTo)
          if (chrome.scripting && chrome.scripting.executeScript) {
            try {
              const mainWorldRes = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',
                args: [timestampSeconds],
                func: (targetSec) => {
                  const player = (document.getElementById('movie_player') as any);
                  if (player && typeof player.seekTo === 'function') {
                    player.seekTo(targetSec, true);
                    if (typeof player.playVideo === 'function') player.playVideo();
                    return true;
                  }
                  const video = document.querySelector<HTMLVideoElement>('video.html5-main-video') ||
                                document.querySelector<HTMLVideoElement>('video');
                  if (video) {
                    video.currentTime = targetSec;
                    video.play().catch(() => {});
                    return true;
                  }
                  return false;
                },
              });
              if (mainWorldRes && mainWorldRes[0] && mainWorldRes[0].result) {
                return true;
              }
            } catch {
              // fallback below
            }
          }

          // 3. Fallback Tier: content script messaging
          try {
            const res = await new Promise<{ success: boolean }>((resolve) => {
              chrome.tabs.sendMessage(
                tab.id!,
                { action: 'SEEK_VIDEO', timestampSeconds, autoPlay: true },
                (resp) => {
                  if (chrome.runtime.lastError || !resp) {
                    resolve({ success: false });
                  } else {
                    resolve(resp);
                  }
                }
              );
            });
            if (res && res.success) return true;
          } catch {}

          // 4. Fallback Tier: direct isolated-world executeScript
          if (chrome.scripting && chrome.scripting.executeScript) {
            try {
              const execRes = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                args: [timestampSeconds],
                func: (targetSec) => {
                  const video = document.querySelector<HTMLVideoElement>('video.html5-main-video') ||
                                document.querySelector<HTMLVideoElement>('video');
                  if (video) {
                    video.currentTime = targetSec;
                    video.play().catch(() => {});
                    try { video.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
                    return true;
                  }
                  return false;
                },
              });
              if (execRes && execRes[0] && execRes[0].result) return true;
            } catch {}
          }
        }

        // Tier 5: If not on same video or video page is different, update tab or navigate
        if (targetUrl) {
          const timestampedUrl = buildTimestampedVideoUrl(targetUrl, timestampSeconds);
          chrome.tabs.update(tab.id, { url: timestampedUrl, active: true });
          if (tab.windowId) chrome.windows.update(tab.windowId, { focused: true });
          return true;
        }
      }

      // If no open YouTube tab was found, open a new tab directly at the timestamp
      if (targetUrl) {
        const timestampedUrl = buildTimestampedVideoUrl(targetUrl, timestampSeconds);
        chrome.tabs.create({ url: timestampedUrl, active: true });
        return true;
      }
    } catch (err) {
      console.warn('[LectureMark] Seek error:', err);
    }
    return false;
  }

  static async togglePlayPause(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) return;
    try {
      const tab = await this.getBestActiveVideoTab();
      if (tab && tab.id) {
        // Try main world player state
        if (chrome.scripting && chrome.scripting.executeScript) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: () => {
              const ytPlayer = (document.getElementById('movie_player') as any);
              if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                if (ytPlayer.getPlayerState() === 1) ytPlayer.pauseVideo();
                else ytPlayer.playVideo();
                return;
              }
              const video = document.querySelector<HTMLVideoElement>('video.html5-main-video') ||
                            document.querySelector<HTMLVideoElement>('video');
              if (video) {
                if (video.paused) video.play().catch(() => {});
                else video.pause();
              }
            },
          }).catch(() => {
            // fallback messaging
            chrome.tabs.sendMessage(tab.id!, { action: 'PLAY_PAUSE_VIDEO' }).catch(() => {});
          });
        } else {
          chrome.tabs.sendMessage(tab.id, { action: 'PLAY_PAUSE_VIDEO' }).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }

  // -------------------------
  // Lectures Management
  // -------------------------
  static async getAllLectures(): Promise<LectureItem[]> {
    const lectures = await lectureDb.getAll();
    const allNotes = await noteDb.getAll();
    // Synchronize actual notes count for each lecture dynamically
    for (const lec of lectures) {
      const actualCount = allNotes.filter((n) => n.lectureId === lec.id).length;
      if (lec.notesCount !== actualCount) {
        lec.notesCount = actualCount;
        await lectureDb.put(lec).catch(() => {});
      }
    }
    return lectures.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async getAllLecturesWithNotes(): Promise<{ lecture: LectureItem; notes: LectureNote[] }[]> {
    const lectures = await lectureDb.getAll();
    const allNotes = await noteDb.getAll();
    return lectures
      .map((lec) => {
        const notes = allNotes
          .filter((n) => n.lectureId === lec.id)
          .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
        lec.notesCount = notes.length;
        return { lecture: lec, notes };
      })
      .sort((a, b) => b.lecture.updatedAt - a.lecture.updatedAt);
  }

  static async getLecture(id: string): Promise<LectureItem | null> {
    return await lectureDb.get(id);
  }

  static async findOrCreateLectureForUrl(
    url: string,
    title: string,
    videoId: string,
    channelName?: string,
    durationSeconds?: number
  ): Promise<LectureItem> {
    const all = await lectureDb.getAll();
    const existing = all.find(
      (l) => (videoId && l.videoId === videoId) || l.videoUrl === url
    );

    if (existing) {
      if (title && title !== 'Video Lecture' && existing.title !== title) {
        existing.title = title;
      }
      if (channelName && !existing.channelName) {
        existing.channelName = channelName;
      }
      if (durationSeconds && durationSeconds > 0) {
        existing.durationSeconds = durationSeconds;
      }
      existing.updatedAt = Date.now();
      await lectureDb.put(existing);
      return existing;
    }

    const newLecture: LectureItem = {
      id: `lec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      videoUrl: url,
      videoId: videoId || url,
      title: title || 'Video Lecture',
      channelName: channelName || '',
      thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '',
      durationSeconds: durationSeconds || 0,
      lastPositionSeconds: 0,
      tags: [],
      notesCount: 0,
    };

    await lectureDb.put(newLecture);
    return newLecture;
  }

  static async saveLecture(lecture: LectureItem): Promise<void> {
    lecture.updatedAt = Date.now();
    await lectureDb.put(lecture);
  }

  static async deleteLecture(id: string): Promise<void> {
    await lectureDb.delete(id);
    // Cascade delete all notes for this lecture
    const allNotes = await noteDb.getAll();
    for (const note of allNotes) {
      if (note.lectureId === id) {
        await noteDb.delete(note.id);
      }
    }
  }

  // -------------------------
  // Notes Management
  // -------------------------
  static async getNotesForLecture(lectureId: string): Promise<LectureNote[]> {
    const all = await noteDb.getAll();
    const filtered = all.filter((n) => n.lectureId === lectureId);
    // Sort chronologically by timestamp
    return filtered.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  }

  static async saveNote(note: LectureNote): Promise<void> {
    note.updatedAt = Date.now();
    if (!note.formattedTimestamp) {
      note.formattedTimestamp = formatSecondsToTimestamp(note.timestampSeconds);
    }
    await noteDb.put(note);

    // Update lecture's count and last position
    const lecture = await lectureDb.get(note.lectureId);
    if (lecture) {
      const lectureNotes = (await noteDb.getAll()).filter((n) => n.lectureId === note.lectureId);
      lecture.notesCount = lectureNotes.length;
      lecture.lastPositionSeconds = note.timestampSeconds;
      lecture.updatedAt = Date.now();
      await lectureDb.put(lecture);
    }
  }

  static async deleteNote(id: string): Promise<void> {
    const note = await noteDb.get(id);
    if (!note) return;
    await noteDb.delete(id);

    // Update lecture count
    const lecture = await lectureDb.get(note.lectureId);
    if (lecture) {
      const lectureNotes = (await noteDb.getAll()).filter((n) => n.lectureId === note.lectureId);
      lecture.notesCount = lectureNotes.length;
      lecture.updatedAt = Date.now();
      await lectureDb.put(lecture);
    }
  }

  static async toggleRevised(noteId: string): Promise<LectureNote | null> {
    const note = await noteDb.get(noteId);
    if (!note) return null;
    note.isRevised = !note.isRevised;
    note.updatedAt = Date.now();
    await noteDb.put(note);
    return note;
  }

  // -------------------------
  // Global Search Across Lectures
  // -------------------------
  static async searchNotesAcrossLectures(
    query: string,
    tagFilter?: string
  ): Promise<{ note: LectureNote; lecture?: LectureItem }[]> {
    const q = query.trim().toLowerCase();
    const allNotes = await noteDb.getAll();
    const allLectures = await lectureDb.getAll();
    const lectureMap = new Map<string, LectureItem>(allLectures.map((l) => [l.id, l]));

    const matches: { note: LectureNote; lecture?: LectureItem }[] = [];

    for (const note of allNotes) {
      const lecture = lectureMap.get(note.lectureId);

      // Tag filter check
      if (tagFilter && tagFilter !== 'all') {
        const hasTag = note.tags && note.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase());
        if (!hasTag) continue;
      }

      if (!q) {
        matches.push({ note, lecture });
        continue;
      }

      const noteText = `${note.title || ''} ${note.content} ${note.tags.join(' ')}`.toLowerCase();
      const lectureText = `${lecture?.title || ''} ${lecture?.channelName || ''}`.toLowerCase();

      if (noteText.includes(q) || lectureText.includes(q)) {
        matches.push({ note, lecture });
      }
    }

    return matches.sort((a, b) => b.note.updatedAt - a.note.updatedAt);
  }

  // -------------------------
  // Export Functions
  // -------------------------
  static async exportLectureMarkdown(lectureId: string): Promise<string> {
    const lecture = await lectureDb.get(lectureId);
    if (!lecture) return '# Lecture Notes\n\nNo lecture found.';

    const notes = await this.getNotesForLecture(lectureId);
    const chapters = notes.filter((n) => n.isChapter || n.tags.includes('Chapter'));
    const standardNotes = notes.filter((n) => !n.isChapter && !n.tags.includes('Chapter'));

    const lines: string[] = [];
    lines.push(`# ${lecture.title}`);
    if (lecture.channelName) {
      lines.push(`**Instructor/Channel:** ${lecture.channelName}`);
    }
    lines.push(`**Original Video:** [Watch on Web](${lecture.videoUrl})`);
    if (lecture.durationSeconds) {
      lines.push(`**Total Duration:** ${formatSecondsToTimestamp(lecture.durationSeconds)}`);
    }
    lines.push(`**Saved Notes:** ${notes.length}`);
    lines.push(`**Export Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    lines.push('');

    // Table of Chapters if any
    if (chapters.length > 0) {
      lines.push('## Chapters & Milestones');
      lines.push('');
      lines.push('| Timestamp | Chapter Title | Link |');
      lines.push('| --------- | ------------- | ---- |');
      for (const ch of chapters) {
        const link = buildTimestampedVideoUrl(lecture.videoUrl, ch.timestampSeconds);
        lines.push(`| \`${ch.formattedTimestamp}\` | ${ch.title || ch.content} | [Jump to ${ch.formattedTimestamp}](${link}) |`);
      }
      lines.push('');
    }

    // Detailed Timestamped Notes
    lines.push('## Timestamped Study Notes');
    lines.push('');

    if (standardNotes.length === 0) {
      lines.push('*No study notes recorded for this lecture yet.*');
    } else {
      for (const note of standardNotes) {
        const tsLink = buildTimestampedVideoUrl(lecture.videoUrl, note.timestampSeconds);
        const tagsBadge = note.tags && note.tags.length > 0 ? ` [${note.tags.map(t => `#${t}`).join(' ')}]` : '';
        const revisedBadge = note.isRevised ? ' *(Revised)*' : '';

        lines.push(`### [▶ ${note.formattedTimestamp}](${tsLink}) ${note.title || 'Note'}${tagsBadge}${revisedBadge}`);
        lines.push('');
        lines.push(note.content);
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('*Generated with LectureMark — Learn smarter. Remember every moment.*');

    return lines.join('\n');
  }

  static async exportAllLecturesJSON(): Promise<string> {
    const lectures = await lectureDb.getAll();
    const notes = await noteDb.getAll();
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        tool: 'LectureMark',
        lectures,
        notes,
      },
      null,
      2
    );
  }

  static async importLecturesJSON(jsonString: string): Promise<{ lecturesCount: number; notesCount: number }> {
    const data = JSON.parse(jsonString);
    if (!data.lectures || !Array.isArray(data.lectures)) {
      throw new Error('Invalid backup file format: missing lectures array');
    }

    let lCount = 0;
    let nCount = 0;

    for (const lec of data.lectures) {
      await lectureDb.put(lec);
      lCount++;
    }

    if (data.notes && Array.isArray(data.notes)) {
      for (const note of data.notes) {
        await noteDb.put(note);
        nCount++;
      }
    }

    return { lecturesCount: lCount, notesCount: nCount };
  }
}
