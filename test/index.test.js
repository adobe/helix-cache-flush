/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

'use strict';

process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

const assert = require('assert');
const { logging } = require('@adobe/helix-testutils');
const nock = require('nock');
const index = require('../src/index.js').main;

describe('Index Tests', () => {
  it('index function accepts a change payload', async () => {
    const logger = logging.createTestLogger();
    const result = await index({
      __ow_logger: logger,
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'master',
      observation: {
        type: 'onedrive',
        change: {
          uid: 'uJoyhgL7Iyii3HtM',
          path: '/helix-content/sub/welcome.docx',
          time: '2020-07-01T10:22:18Z',
          type: 'modified',
        },
        mountpoint: { path: '/office/', root: '/helix-content' },
      },
    });
    const out = logger.getOutput().trim().split('\n');
    assert.deepEqual(out, [
      'info: received change event on tripodsan/helix-pages-test/master { type: \'onedrive\', change: { uid: \'uJoyhgL7Iyii3HtM\', path: \'/helix-content/sub/welcome.docx\', time: \'2020-07-01T10:22:18Z\', type: \'modified\' }, mountpoint: { path: \'/office/\', root: \'/helix-content\' } }',
      'info: location: https://raw.githubusercontent.com/tripodsan/helix-pages-test/master/office/sub/welcome.md, surrogate key: V7WzCsO/wRee03zH',
      'debug: fetching content from https://raw.githubusercontent.com/tripodsan/helix-pages-test/master/.github/helix-bot.yaml.gpg',
      'warn: requested content not found.',
      'warn: Unable to load helix-bot config from tripodsan/helix-pages-test.git/.github/helix-bot.yaml.gpg#master',
      'info: HLX_PAGES_FASTLY_SVC_ID not configured. Ignoring check for helix-pages repository.',
    ]);
    assert.deepEqual(result, { });
  });

  it('index function computes a drive location', async () => {
    const logger = logging.createTestLogger();
    const result = await index({
      __ow_logger: logger,
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'master',
      observation: {
        type: 'onedrive',
        change: {
          uid: 'uJoyhgL7Iyii3HtM',
          path: '/helix-content/sub/welcome.docx',
          time: '2020-07-01T10:22:18Z',
          type: 'modified',
          provider: {
            itemId: 'myItem',
          },
        },
        mountpoint: { path: '/office/', root: '/helix-content' },
        provider: {
          driveId: 'mydrive',
        },
      },
    });
    const out = logger.getOutput().trim().split('\n');
    assert.equal(out[1], 'info: location: /drives/mydrive/items/myItem, surrogate key: bAuepGgWBaCzPO/Y');
    assert.deepEqual(result, { });
  });

  it('index function computes a drive location for resource w/o extension', async () => {
    const logger = logging.createTestLogger();
    const result = await index({
      __ow_logger: logger,
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'master',
      observation: {
        type: 'github',
        change: {
          uid: 'uJoyhgL7Iyii3HtM',
          path: '/foo/document',
          time: '2020-07-01T10:22:18Z',
          type: 'modified',
        },
      },
    });
    const out = logger.getOutput().trim().split('\n');
    assert.equal(out[1], 'info: location: https://raw.githubusercontent.com/tripodsan/helix-pages-test/master/foo/document, surrogate key: Aov/K6CjZkuEV7/r');
    assert.deepEqual(result, { });
  });

  it('rejects payload w/o owner', async () => {
    const result = await index({ owner: '', repo: 'repo', ref: 'ref' });
    assert.deepEqual(result, { statusCode: 500 });
  });

  it('rejects payload w/o repo', async () => {
    const result = await index({ owner: 'owner', repo: '', ref: 'ref' });
    assert.deepEqual(result, { statusCode: 500 });
  });

  it('rejects payload w/o ref', async () => {
    const result = await index({ owner: 'owner', repo: 'repo', ref: '' });
    assert.deepEqual(result, { statusCode: 500 });
  });

  it('index function requires fastly token', async () => {
    const logger = logging.createTestLogger();
    const result = await index({
      __ow_logger: logger,
      HLX_PAGES_FASTLY_SVC_ID: 'test-service',
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'master',
      observation: {
        type: 'onedrive',
        change: {
          uid: 'uJoyhgL7Iyii3HtM',
          path: '/helix-content/sub/welcome.docx',
          time: '2020-07-01T10:22:18Z',
          type: 'modified',
        },
        mountpoint: { path: '/office/', root: '/helix-content' },
      },
    });
    const out = logger.getOutput().trim().split('\n');
    assert.deepEqual(out.pop(), 'warn: tripodsan/helix-pages-test/master[0] no fastlyToken configured.');
    assert.deepEqual(result, { });
  });

  it('index function works for deleted events', async () => {
    const logger = logging.createTestLogger();
    const result = await index({
      __ow_logger: logger,
      HLX_PAGES_FASTLY_SVC_ID: 'test-service',
      HLX_PAGES_FASTLY_TOKEN: 'test-token',
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'master',
      observation: {
        type: 'onedrive',
        change: {
          uid: 'uJoyhgL7Iyii3HtM',
          time: '2020-07-01T10:22:18Z',
          type: 'deleted',
        },
        mountpoint: { path: '/office/', root: '/helix-content' },
      },
    });
    const out = logger.getOutput().trim().split('\n');
    assert.deepEqual(out.pop(), 'warn: location unknown. ignoring cache purge.');
    assert.deepEqual(result, { });
  });

  it('index sends purge request to fastly', async () => {
    const scope = nock('https://api.fastly.com')
      .post('/service/test-service/purge')
      .reply((uri, body) => {
        assert.deepEqual(body, {
          surrogate_keys: [
            'V7WzCsO/wRee03zH',
          ],
        });
        return [200, { 'V7WzCsO/wRee03zH': '19940-1591821325-42118515' }];
      });

    const logger = logging.createTestLogger();
    const result = await index({
      HLX_PAGES_FASTLY_SVC_ID: 'test-service',
      HLX_PAGES_FASTLY_TOKEN: 'test-token',
      __ow_logger: logger,
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'master',
      observation: {
        type: 'onedrive',
        change: {
          uid: 'uJoyhgL7Iyii3HtM',
          path: '/helix-content/sub/welcome.docx',
          time: '2020-07-01T10:22:18Z',
          type: 'modified',
        },
        mountpoint: { path: '/office/', root: '/helix-content' },
      },
    });
    const out = logger.getOutput().trim().split('\n');
    assert.deepEqual(out.pop(), 'info: tripodsan/helix-pages-test/master[0] purge result:  { \'V7WzCsO/wRee03zH\': \'19940-1591821325-42118515\' }');
    assert.deepEqual(result, { });

    await scope.done();
  });

  it('index sends purge request to fastly and handles errors', async () => {
    const scope = nock('https://api.fastly.com')
      .post('/service/test-service/purge')
      .reply(500);

    const logger = logging.createTestLogger();
    const result = await index({
      HLX_PAGES_FASTLY_SVC_ID: 'test-service',
      HLX_PAGES_FASTLY_TOKEN: 'test-token',
      // __ow_logger: logger,
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'master',
      observation: {
        type: 'onedrive',
        change: {
          uid: 'uJoyhgL7Iyii3HtM',
          path: '/helix-content/sub/welcome.docx',
          time: '2020-07-01T10:22:18Z',
          type: 'modified',
        },
        mountpoint: { path: '/office/', root: '/helix-content' },
      },
    });
    const out = logger.getOutput().trim().split('\n');
    assert.ok(out.pop().indexOf('status: 500, name: \'FastlyError\''));
    assert.deepEqual(result, { });

    await scope.done();
  });
});
