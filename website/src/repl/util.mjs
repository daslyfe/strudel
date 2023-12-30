import { controls, evalScope, hash2code, logger } from '@strudel.cycles/core';
import { settingPatterns } from '../settings.mjs';
import { isTauri } from '../tauri.mjs';
import './Repl.css';
import * as tunes from './tunes.mjs';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { writeText } from '@tauri-apps/api/clipboard';

// Create a single supabase client for interacting with your database
const supabase = createClient(
  'https://pidxdsxphlhzjnzmifth.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZHhkc3hwaGxoempuem1pZnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTYyMzA1NTYsImV4cCI6MTk3MTgwNjU1Nn0.bqlw7802fsWRnqU5BLYtmXk_k-D1VFmbkHMywWc15NM',
);

export async function initCode() {
  // load code from url hash (either short hash from database or decode long hash)
  try {
    const initialUrl = window.location.href;
    const hash = initialUrl.split('?')[1]?.split('#')?.[0];
    const codeParam = window.location.href.split('#')[1] || '';
    // looking like https://strudel.cc/?J01s5i1J0200 (fixed hash length)
    if (codeParam) {
      // looking like https://strudel.cc/#ImMzIGUzIg%3D%3D (hash length depends on code length)
      return hash2code(codeParam);
    } else if (hash) {
      return supabase
        .from('code')
        .select('code')
        .eq('hash', hash)
        .then(({ data, error }) => {
          if (error) {
            console.warn('failed to load hash', error);
          }
          if (data.length) {
            //console.log('load hash from database', hash);
            return data[0].code;
          }
        });
    }
  } catch (err) {
    console.warn('failed to decode', err);
  }
}

export function getRandomTune() {
  const allTunes = Object.entries(tunes);
  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const [name, code] = randomItem(allTunes);
  return { name, code };
}

export function loadModules() {
  let modules = [
    import('@strudel.cycles/core'),
    import('@strudel.cycles/tonal'),
    import('@strudel.cycles/mini'),
    import('@strudel.cycles/xen'),
    import('@strudel.cycles/webaudio'),
    import('@strudel/codemirror'),
    import('@strudel/hydra'),
    import('@strudel.cycles/serial'),
    import('@strudel.cycles/soundfonts'),
    import('@strudel.cycles/csound'),
  ];
  if (isTauri()) {
    modules = modules.concat([
      import('@strudel/desktopbridge/loggerbridge.mjs'),
      import('@strudel/desktopbridge/midibridge.mjs'),
      import('@strudel/desktopbridge/oscbridge.mjs'),
    ]);
  } else {
    modules = modules.concat([import('@strudel.cycles/midi'), import('@strudel.cycles/osc')]);
  }

  return evalScope(
    controls, // sadly, this cannot be exported from core direclty
    settingPatterns,
    ...modules,
  );
}

let lastShared;
export async function shareCode(codeToShare) {
  // const codeToShare = activeCode || code;
  if (lastShared === codeToShare) {
    logger(`Link already generated!`, 'error');
    return;
  }
  // generate uuid in the browser
  const hash = nanoid(12);
  const shareUrl = window.location.origin + window.location.pathname + '?' + hash;
  const { data, error } = await supabase.from('code').insert([{ code: codeToShare, hash }]);
  if (!error) {
    lastShared = codeToShare;
    // copy shareUrl to clipboard
    if (isTauri()) {
      await writeText(shareUrl);
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
    const message = `Link copied to clipboard: ${shareUrl}`;
    alert(message);
    // alert(message);
    logger(message, 'highlight');
  } else {
    console.log('error', error);
    const message = `Error: ${error.message}`;
    // alert(message);
    logger(message);
  }
}
