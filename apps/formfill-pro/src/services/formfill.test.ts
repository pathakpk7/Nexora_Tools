import { describe, it, expect } from 'vitest';
import { FormFillService } from './formfill';
import { FormProfile, DetectedFormField } from '../../../../packages/shared-types/src/index';

describe('FormFill Pro Field Matching Unit Tests', () => {
  const profile: FormProfile = {
    id: 'test_prof',
    name: 'Test Profile',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: [
      { id: '1', label: 'Full Name', type: 'fullName', value: 'Jordan Lee' },
      { id: '2', label: 'Email', type: 'email', value: 'jordan@example.com' },
      { id: '3', label: 'College', type: 'college', value: 'MIT' },
    ],
  };

  it('matches detected candidate name and email accurately', () => {
    const detected: DetectedFormField[] = [
      {
        elementSelector: '#candidate_name',
        name: 'full_name',
        id: 'candidate_name',
        type: 'text',
        label: 'Candidate Full Name',
        placeholder: 'Enter name',
        confidence: 0.9,
      },
      {
        elementSelector: '#applicant_email',
        name: 'email',
        id: 'applicant_email',
        type: 'email',
        label: 'Primary Email',
        placeholder: 'you@domain.com',
        confidence: 0.9,
      },
      {
        elementSelector: '#random_field',
        name: 'unrelated',
        id: 'random_field',
        type: 'text',
        label: 'Hobbies',
        placeholder: '',
        confidence: 0.2,
      },
    ];

    const matches = FormFillService.matchFieldsWithProfile(detected, profile);

    expect(matches.length).toBe(2);
    expect(matches[0].matchedValue).toBe('Jordan Lee');
    expect(matches[1].matchedValue).toBe('jordan@example.com');
  });
});
