// 音质档位 hint 契约测试（spec: songloft .scratch/audio-quality-routing D1/D5/D6）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createMusicUrlHandler,
  resolveQualityHint,
  type HTTPRequest,
} from '../src/index.ts';

function post(body: unknown): HTTPRequest {
  return {
    method: 'POST',
    path: '/api/music/url',
    query: {},
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } as HTTPRequest;
}

test('createMusicUrlHandler 把 body.quality 传给 resolveUrl 的 context', async () => {
  let seen: { sourceData: unknown; quality: string | undefined } | null = null;
  const handler = createMusicUrlHandler({
    resolveUrl: async (sourceData, ctx) => {
      seen = { sourceData, quality: ctx?.quality };
      return 'https://cdn/x.mp3';
    },
  });

  const res = await handler(post({ source_data: { id: '1' }, quality: '192k' }), {});
  assert.equal(res.statusCode, 200);
  assert.ok(seen);
  assert.equal(seen.quality, '192k');
  assert.deepEqual((seen as { sourceData: unknown }).sourceData, { id: '1' });
});

test('createMusicUrlHandler 缺省 quality 时 context.quality 为 undefined（旧插件不受影响）', async () => {
  let seenQuality: string | undefined | 'unset' = 'unset';
  const handler = createMusicUrlHandler({
    resolveUrl: async (_sourceData, ctx) => {
      seenQuality = ctx?.quality;
      return 'https://cdn/x.mp3';
    },
  });

  await handler(post({ source_data: { id: '1' } }), {});
  assert.equal(seenQuality, undefined);
});

test('fallback 路径的 resolveUrl 同样收到 context.quality', async () => {
  let firstCall = true;
  const qualities: Array<string | undefined> = [];
  const handler = createMusicUrlHandler({
    resolveUrl: async (_sourceData, ctx) => {
      qualities.push(ctx?.quality);
      if (firstCall) {
        firstCall = false;
        throw new Error('primary failed');
      }
      return 'https://cdn/y.mp3';
    },
    fallbackSearch: async () => ({ source_data: { id: '2' } }),
  });

  const res = await handler(
    post({
      source_data: { id: '1' },
      quality: '128k',
      fallback: { enabled: true, title: 'T', artist: 'A' },
    }),
    {},
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(qualities, ['128k', '128k']);
});

test('resolveQualityHint：合法 native/别名拼写原样透传', () => {
  for (const tier of ['128k', '192k', '320k', 'low', 'standard', 'high', 'super']) {
    assert.equal(resolveQualityHint(tier, '320k'), tier, tier);
  }
});

test('resolveQualityHint：非法/越权值（auto、无损档、垃圾值）防御归一 320k', () => {
  for (const bad of ['auto', 'flac', 'hires', 'master', 'surround51', '999k', '']) {
    assert.equal(resolveQualityHint(bad, '320k'), '320k', bad);
  }
});

test('resolveQualityHint：空值回落调用方默认（kwqq 传 cfg.quality）', () => {
  assert.equal(resolveQualityHint(undefined, '192k'), '192k');
  assert.equal(resolveQualityHint('', '320k'), '320k');
});
