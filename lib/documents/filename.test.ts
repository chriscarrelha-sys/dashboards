import { describe, it, expect } from 'vitest';
import { generateStandardizedName, slugToken, extFromName } from './filename';

describe('slugToken', () => {
  it('hyphenates and strips punctuation', () => {
    expect(slugToken('Answer and Counterclaims')).toBe('Answer-and-Counterclaims');
    expect(slugToken('Reply in Support of Remand!')).toBe('Reply-in-Support-of-Remand');
    expect(slugToken('  multiple   spaces ')).toBe('multiple-spaces');
  });
  it('returns empty for nullish', () => {
    expect(slugToken(null)).toBe('');
    expect(slugToken(undefined)).toBe('');
  });
});

describe('generateStandardizedName', () => {
  it('matches the documented default pattern', () => {
    expect(
      generateStandardizedName({
        date: new Date(Date.UTC(2026, 4, 12)),
        caseShortName: 'Regions',
        title: 'Answer and Counterclaims',
        party: 'Defendants',
        status: 'Filed',
        ext: 'pdf',
      }),
    ).toBe('2026-05-12_Regions_Answer-and-Counterclaims_Defendants_Filed.pdf');
  });

  it('handles a received document', () => {
    expect(
      generateStandardizedName({
        date: '2026-07-01',
        caseShortName: 'Regions',
        title: 'Farr Verification',
        party: 'Plaintiff',
        status: 'received',
        ext: 'pdf',
      }),
    ).toBe('2026-07-01_Regions_Farr-Verification_Plaintiff_Received.pdf');
  });

  it('omits empty optional segments and defaults the extension', () => {
    expect(
      generateStandardizedName({ caseShortName: 'Regions', title: 'Notice' }),
    ).toBe('undated_Regions_Notice.pdf');
  });

  it('falls back to defaults when everything is missing', () => {
    expect(generateStandardizedName({ caseShortName: '' })).toBe('undated_Case_Document.pdf');
  });
});

describe('extFromName', () => {
  it('extracts and lower-cases via caller', () => {
    expect(extFromName('scan0007.PDF')).toBe('PDF');
    expect(extFromName('noext')).toBe('');
  });
});
