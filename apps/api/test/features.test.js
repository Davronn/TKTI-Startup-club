const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { detectDocumentType, isInlineType, startupFileUrl } = require('../dist/startup-files/startup-files.service.js');
const { buildDigest, escapeHtml, tashkentNow } = require('../dist/notifications/notifications.service.js');
const { ListStartupsDto } = require('../dist/startups/dto/list-startups.dto.js');
const { CreateStartupDto } = require('../dist/startups/dto/create-startup.dto.js');

const pad = (head) => Buffer.concat([Buffer.from(head), Buffer.alloc(16)]);
const errorsOf = (Dto, plain) => validateSync(plainToInstance(Dto, plain)).map((error) => error.property);

test('document type is detected from content; office files need a ZIP header and a known extension', () => {
  assert.equal(detectDocumentType(pad('%PDF-1.7'), 'x.bin'), 'application/pdf');
  assert.equal(detectDocumentType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'logo.pdf'), 'image/png');
  const zip = pad([0x50, 0x4b, 0x03, 0x04]);
  assert.match(detectDocumentType(zip, 'Taqdimot.PPTX'), /presentationml/);
  assert.match(detectDocumentType(zip, 'hisobot.xlsx'), /spreadsheetml/);
  assert.equal(detectDocumentType(zip, 'virus.exe'), null);
  assert.equal(detectDocumentType(pad('MZ'), 'hujjat.docx'), null, 'extension alone is not trusted');
  assert.equal(detectDocumentType(pad('<html><script>'), 'page.pdf'), null);
});

test('only images and PDF are served inline', () => {
  assert.equal(isInlineType('image/png'), true);
  assert.equal(isInlineType('application/pdf'), true);
  assert.equal(isInlineType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), false);
  assert.equal(startupFileUrl('a', 'b'), '/api/backend/startups/a/files/b');
});

test('telegram digest escapes user text and is skipped when there is nothing to report', () => {
  assert.equal(buildDigest('Klub', [], [], 'http://x'), null);
  const item = { title: '<b>MVP</b> & test', dueDate: new Date('2026-11-01T00:00:00Z'), startup: { id: 's1', name: 'A<b>' }, assignee: { fullName: 'Ali' } };
  const text = buildDigest('Klub', [item], [], 'https://club.uz');
  assert.match(text, /&lt;b&gt;MVP&lt;\/b&gt; &amp; test/);
  assert.match(text, /href="https:\/\/club\.uz\/startups\/s1"/);
  assert.match(text, /01\.11\.2026, Ali/);
  assert.doesNotMatch(text, /<b>MVP/);
  assert.equal(escapeHtml('a<b>&'), 'a&lt;b&gt;&amp;');
});

test('telegram digest truncates long lists', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ title: `V${i}`, dueDate: null, startup: { id: `s${i}`, name: `S${i}` }, assignee: null }));
  const text = buildDigest('Klub', items, [], 'http://x');
  assert.match(text, /Muddati o‘tgan: 20 ta/);
  assert.match(text, /va yana 5 ta/);
});

test('tashkent date rolls over at 19:00 UTC', () => {
  assert.deepEqual(tashkentNow(new Date('2026-11-03T18:59:00Z')), { date: '2026-11-03', hour: 23 });
  assert.deepEqual(tashkentNow(new Date('2026-11-03T19:00:00Z')), { date: '2026-11-04', hour: 0 });
});

test('startup list accepts only known sort fields', () => {
  assert.deepEqual(errorsOf(ListStartupsDto, { sort: 'name', order: 'asc' }), []);
  assert.ok(errorsOf(ListStartupsDto, { sort: 'passwordHash' }).includes('sort'));
  assert.ok(errorsOf(ListStartupsDto, { order: 'sideways' }).includes('order'));
});

test('logo url may be an uploaded file path or a full external URL, nothing else', () => {
  const base = { name: 'Test', currentStageId: '11111111-1111-4111-8111-111111111111' };
  const internal = '/api/backend/startups/11111111-1111-4111-8111-111111111111/files/22222222-2222-4222-8222-222222222222';
  assert.deepEqual(errorsOf(CreateStartupDto, { ...base, logoUrl: internal }), []);
  assert.deepEqual(errorsOf(CreateStartupDto, { ...base, logoUrl: 'https://cdn.uz/logo.png' }), []);
  assert.ok(errorsOf(CreateStartupDto, { ...base, logoUrl: 'javascript:alert(1)' }).includes('logoUrl'));
  assert.ok(errorsOf(CreateStartupDto, { ...base, logoUrl: '/api/backend/auth/logout' }).includes('logoUrl'));
});
