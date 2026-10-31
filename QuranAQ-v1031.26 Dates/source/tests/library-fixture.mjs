import fs from 'node:fs';
export const libraryFixture=JSON.parse(fs.readFileSync(new URL('./fixtures/library.json',import.meta.url),'utf8'));
export const fixtureBook=name=>libraryFixture[name];
