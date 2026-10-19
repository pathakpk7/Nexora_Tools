import { describe, it, expect, beforeEach } from 'vitest';
import { LectureMarkService } from './lecturemark';
import { LectureItem, LectureNote } from '@nexora/shared-types';

describe('LectureMarkService Unit Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    const lectures = await LectureMarkService.getAllLectures();
    for (const l of lectures) {
      await LectureMarkService.deleteLecture(l.id);
    }
  });

  it('starts completely empty without seeded data', async () => {
    const list = await LectureMarkService.getAllLectures();
    expect(list).toEqual([]);
  });

  it('creates and retrieves a lecture', async () => {
    const lecture = await LectureMarkService.findOrCreateLectureForUrl(
      'https://www.youtube.com/watch?v=os_lecture_01',
      'Operating Systems Lecture 1',
      'os_lecture_01',
      'NPTEL IIT Madras',
      3600
    );

    expect(lecture).toBeDefined();
    expect(lecture.title).toBe('Operating Systems Lecture 1');
    expect(lecture.channelName).toBe('NPTEL IIT Madras');
    expect(lecture.videoId).toBe('os_lecture_01');

    const all = await LectureMarkService.getAllLectures();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(lecture.id);
  });

  it('saves notes with chronological ordering and updates lecture note count', async () => {
    const lecture = await LectureMarkService.findOrCreateLectureForUrl(
      'https://www.youtube.com/watch?v=process_threads',
      'Processes and Threads',
      'process_threads'
    );

    const note1: LectureNote = {
      id: 'note_2',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lectureId: lecture.id,
      timestampSeconds: 738, // 12:18
      formattedTimestamp: '12:18',
      title: 'Difference between a process and thread',
      content: 'Process is an executing program with isolated address space. Threads share address space.',
      tags: ['Important'],
      isRevised: false,
    };

    const note2: LectureNote = {
      id: 'note_1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lectureId: lecture.id,
      timestampSeconds: 272, // 04:32
      formattedTimestamp: '04:32',
      title: 'Introduction to process states',
      content: 'New, Ready, Running, Waiting, Terminated.',
      tags: ['Exam'],
      isRevised: false,
    };

    // Save in non-chronological order
    await LectureMarkService.saveNote(note1);
    await LectureMarkService.saveNote(note2);

    const notes = await LectureMarkService.getNotesForLecture(lecture.id);
    expect(notes.length).toBe(2);
    // Verified chronological sorting
    expect(notes[0].timestampSeconds).toBe(272);
    expect(notes[0].formattedTimestamp).toBe('04:32');
    expect(notes[1].timestampSeconds).toBe(738);
    expect(notes[1].formattedTimestamp).toBe('12:18');

    // Lecture updated
    const updatedLecture = await LectureMarkService.getLecture(lecture.id);
    expect(updatedLecture?.notesCount).toBe(2);
  });

  it('toggles revision status correctly', async () => {
    const lecture = await LectureMarkService.findOrCreateLectureForUrl(
      'https://www.youtube.com/watch?v=test_rev',
      'Test Revision',
      'test_rev'
    );

    const note: LectureNote = {
      id: 'note_rev',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lectureId: lecture.id,
      timestampSeconds: 100,
      formattedTimestamp: '01:40',
      title: 'Revise algorithm',
      content: 'Check time complexity',
      tags: ['Doubt'],
      isRevised: false,
    };

    await LectureMarkService.saveNote(note);
    const toggled = await LectureMarkService.toggleRevised('note_rev');
    expect(toggled?.isRevised).toBe(true);

    const notes = await LectureMarkService.getNotesForLecture(lecture.id);
    expect(notes[0].isRevised).toBe(true);
  });

  it('searches notes across multiple lectures and filters by tag', async () => {
    const lec1 = await LectureMarkService.findOrCreateLectureForUrl(
      'https://www.youtube.com/watch?v=lec1',
      'Concurrency in OS',
      'lec1'
    );
    const lec2 = await LectureMarkService.findOrCreateLectureForUrl(
      'https://www.youtube.com/watch?v=lec2',
      'Database Transactions',
      'lec2'
    );

    await LectureMarkService.saveNote({
      id: 'n1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lectureId: lec1.id,
      timestampSeconds: 300,
      formattedTimestamp: '05:00',
      title: 'Deadlock conditions',
      content: 'Mutual exclusion, hold and wait, no preemption, circular wait.',
      tags: ['Exam', 'Important'],
    });

    await LectureMarkService.saveNote({
      id: 'n2',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lectureId: lec2.id,
      timestampSeconds: 450,
      formattedTimestamp: '07:30',
      title: 'Deadlock in 2PL',
      content: 'Wait-die and wound-wait deadlock prevention schemes.',
      tags: ['Assignment'],
    });

    // Search "deadlock" without tag filter
    const allMatches = await LectureMarkService.searchNotesAcrossLectures('deadlock');
    expect(allMatches.length).toBe(2);

    // Search with tag filter "Exam"
    const examMatches = await LectureMarkService.searchNotesAcrossLectures('deadlock', 'Exam');
    expect(examMatches.length).toBe(1);
    expect(examMatches[0].note.title).toBe('Deadlock conditions');
  });

  it('exports lecture notes to formatted Markdown with timestamp links', async () => {
    const lec = await LectureMarkService.findOrCreateLectureForUrl(
      'https://www.youtube.com/watch?v=demo_markdown',
      'Computer Networks: Transport Layer',
      'demo_markdown',
      'Prof. David',
      1800
    );

    await LectureMarkService.saveNote({
      id: 'chapter_1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lectureId: lec.id,
      timestampSeconds: 0,
      formattedTimestamp: '00:00',
      title: 'Introduction to TCP and UDP',
      content: 'Overview of transport protocols',
      tags: ['Chapter'],
      isChapter: true,
    });

    await LectureMarkService.saveNote({
      id: 'note_tcp',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lectureId: lec.id,
      timestampSeconds: 615,
      formattedTimestamp: '10:15',
      title: 'TCP 3-way Handshake',
      content: 'SYN -> SYN-ACK -> ACK sequence with initial sequence numbers.',
      tags: ['Exam'],
    });

    const md = await LectureMarkService.exportLectureMarkdown(lec.id);
    expect(md).toContain('# Computer Networks: Transport Layer');
    expect(md).toContain('**Instructor/Channel:** Prof. David');
    expect(md).toContain('## Chapters & Milestones');
    expect(md).toContain('`00:00`');
    expect(md).toContain('TCP 3-way Handshake');
    expect(md).toContain('https://www.youtube.com/watch?v=demo_markdown&t=615s');
  });
});
