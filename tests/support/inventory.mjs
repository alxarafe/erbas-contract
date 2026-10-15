import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const collectionDirectory = '/runner/bruno';
export async function collectionInventory() {
  const entries = await readdir(collectionDirectory, { recursive: true });
  const files = entries.filter(file => file.endsWith('.bru') && !file.endsWith('folder.bru'));
  const checksIn = source => (source.match(/\btest\("/g) ?? []).length;
  const folderChecks = new Map();
  for (const file of entries.filter(file => file.endsWith('folder.bru'))) {
    folderChecks.set(dirname(file), checksIn(await readFile(join(collectionDirectory, file), 'utf8')));
  }
  let checks = 0;
  const sequences = [];
  for (const file of files) {
    const source = await readFile(join(collectionDirectory, file), 'utf8');
    checks += checksIn(source);
    for (let parent = dirname(file); parent !== '.'; parent = dirname(parent)) checks += folderChecks.get(parent) ?? 0;
    sequences.push(Number(source.match(/seq: (\d+)/)[1]));
  }
  return { files, checks, sequences, collections: entries.filter(file => file.endsWith('bruno.json')) };
}
