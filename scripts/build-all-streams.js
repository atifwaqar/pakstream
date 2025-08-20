#!/usr/bin/env node
/* Merge split JSON files into /all_streams.json with a normalized schema */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'all_streams.json');

// Adjust these paths to your repo
const SOURCES = {
  radio: path.join(ROOT, 'radio_channels.json'),
  tv: path.join(ROOT, 'channels.json'),
  creators: path.join(ROOT, 'creators_channels.json'),
  freepress: path.join(ROOT, 'freepress_channels.json')
};

function readJson(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const txt = fs.readFileSync(p, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    console.error('Failed to read JSON:', p, e.message);
    return null;
  }
}

function normId(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '')
    .slice(0, 80);
}

function asArray(x) {
  return Array.isArray(x) ? x : (x ? [x] : []);
}

function nowUtc() {
  return new Date().toISOString();
}

const items = [];
const counts = { radio:0, tv:0, creators:0, freepress:0 };

// RADIO
const radio = readJson(SOURCES.radio);
if (radio && Array.isArray(radio.items || radio)) {
  (radio.items || radio).forEach(r => {
    const id = normId(r.id || r.key || r.name);
    items.push({
      id,
      kind: 'radio',
      name: r.name || r.title || 'Unknown Station',
      desc: r.desc || r.description || '',
      region: r.region || r.country || '',
      tags: asArray(r.tags),
      stream: r.stream || r.url || r.src || '',
      logo: r.logo || r.image || '',
      status: r.status || 'active',
      source: 'radio_channels.json',
      last_modified: r.last_modified || null
    });
    counts.radio++;
  });
}

// TV
const tv = readJson(SOURCES.tv);
if (tv && Array.isArray(tv.items || tv)) {
  (tv.items || tv).forEach(c => {
    const id = normId(c.id || c.key || c.name);
    items.push({
      id,
      kind: 'tv',
      name: c.name || c.title || 'Unknown Channel',
      desc: c.desc || c.description || '',
      region: c.region || c.country || '',
      tags: asArray(c.tags),
      stream: c.stream || c.embed || c.url || '',
      logo: c.logo || c.image || '',
      status: c.status || 'active',
      source: 'channels.json',
      last_modified: c.last_modified || null
    });
    counts.tv++;
  });
}

// CREATORS
const creators = readJson(SOURCES.creators);
if (creators && Array.isArray(creators.items || creators)) {
  (creators.items || creators).forEach(c => {
    const id = normId(c.id || c.key || c.name);
    items.push({
      id,
      kind: 'creator',
      name: c.name || c.title || 'Unknown Creator',
      desc: c.desc || c.about || '',
      tags: asArray(c.tags),
      channelId: c.channelId || c.youtubeChannelId || '',
      avatar: c.avatar || c.image || '',
      url: c.url || (c.channelId ? `https://youtube.com/channel/${c.channelId}` : ''),
      status: c.status || 'active',
      source: 'creators_channels.json',
      last_modified: c.last_modified || null
    });
    counts.creators++;
  });
}

// FREEPRESS
const fp = readJson(SOURCES.freepress);
if (fp && Array.isArray(fp.items || fp)) {
  (fp.items || fp).forEach(c => {
    const id = normId(c.id || c.key || c.name);
    items.push({
      id,
      kind: 'freepress',
      name: c.name || c.title || 'Unknown',
      desc: c.desc || c.description || '',
      tags: asArray(c.tags),
      url: c.url || '',
      logo: c.logo || c.image || '',
      status: c.status || 'active',
      source: 'freepress_channels.json',
      last_modified: c.last_modified || null
    });
    counts.freepress++;
  });
}

// Output schema
const out = {
  schema_version: 1,
  version: Math.floor(Date.now() / 1000),
  generated_utc: nowUtc(),
  source_urls: {
    radio: 'radio_channels.json',
    tv: 'channels.json',
    creators: 'creators_channels.json',
    freepress: 'freepress_channels.json'
  },
  counts,
  items
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote', OUT, 'items:', items.length, 'counts:', counts);
