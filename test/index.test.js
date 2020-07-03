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

const assert = require('assert');
const { logging } = require('@adobe/helix-testutils');
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
    const out = logger.getOutput();
    assert.equal(out, 'info: received change event on tripodsan/helix-pages-test/master: {"_path":"/office/sub/welcome.docx","_uid":"uJoyhgL7Iyii3HtM","_type":"modified"}\n');
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
});
