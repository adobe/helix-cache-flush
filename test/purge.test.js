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

const path = require('path');
const fse = require('fs-extra');
const assert = require('assert');
const { logging } = require('@adobe/helix-testutils');
const { Crypt } = require('@adobe/helix-bot-shared');
const yaml = require('js-yaml');
const nock = require('nock');
const Purge = require('../src/Purge.js');

const TEST_PRIV_KEY_FILE = path.resolve(__dirname, 'fixtures', 'privkey.asc');

const GH_PRIV_KEY_FILE = path.resolve(__dirname, 'fixtures', 'app-privatekey.pem');

const TEST_PUB_KEY_FILE = path.resolve(__dirname, 'fixtures', 'pubkey.asc');

describe('Purge Tests', () => {
  it('loads purge config via raw github', async () => {
    const data = yaml.dump({
      version: 1,
      branch: 'devel',
      caches: [{
        domains: ['foo.bar'],
        fastlyServiceId: '1234',
        fastlyToken: 'dummy',
      }],
    });

    const crypt = new Crypt()
      .withPrivateKey(TEST_PRIV_KEY_FILE)
      .withPrivateKeyPwd('test')
      .withPublicKey(TEST_PUB_KEY_FILE);

    const secureConfig = Buffer.from(await crypt.encrypt(data));

    nock('https://raw.githubusercontent.com')
      .get('/tripodsan/helix-pages-test/devel/helix-config.yaml')
      .reply(404)
      .get('/tripodsan/helix-pages-test/devel/.github/helix-bot.yaml.gpg')
      .reply(200, secureConfig);

    const logger = logging.createTestLogger();
    const purge = new Purge({
      __ow_logger: logger,
      HLX_PAGES_FASTLY_SVC_ID: 'test-service',
      HLX_PAGES_FASTLY_TOKEN: 'test-token',
      HLX_BOT_PRIVATE_KEY: await fse.readFile(TEST_PRIV_KEY_FILE),
      HLX_BOT_PRIVATE_KEY_PW: 'test',
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'devel',
    });
    const cfg = await purge.getPurgeConfig();
    assert.deepEqual(cfg.config, {
      branch: 'devel',
      caches: [{
        domains: ['foo.bar'],
        fastlyServiceId: '1234',
        fastlyToken: 'dummy',
      }, {
        domains: ['*.project-helix.page', '*.hlx.page'],
        fastlyServiceId: 'test-service',
        fastlyToken: 'test-token',
      }],
      version: 1,
    });
  });

  it('loads purge config via bot credentials', async () => {
    const data = yaml.dump({
      version: 1,
      branch: 'devel',
      caches: [{
        domains: ['foo.bar'],
        fastlyServiceId: '1234',
        fastlyToken: 'dummy',
      }],
    });

    const crypt = new Crypt()
      .withPrivateKey(TEST_PRIV_KEY_FILE)
      .withPrivateKeyPwd('test')
      .withPublicKey(TEST_PUB_KEY_FILE);

    const secureConfig = Buffer.from(await crypt.encrypt(data));

    nock('https://raw.githubusercontent.com')
      .get('/tripodsan/helix-pages-test/devel/helix-config.yaml')
      .reply(404)
      .get('/tripodsan/helix-pages-test/devel/.github/helix-bot.yaml.gpg')
      .reply(200, secureConfig);

    nock('https://api.github.com')
      .get('/repos/tripodsan/helix-pages-test/installation')
      .reply(200, { id: 556677 })
      .post('/app/installations/556677/access_tokens')
      .reply(200, {
        type: 'token',
        tokenType: 'installation',
        token: 'foobar',
        installationId: 863255,
        permissions: { contents: 'write', issues: 'write' },
      })
      .get('/repos/tripodsan/helix-pages-test/contents/.github%2Fhelix-bot.yaml.gpg?ref=devel')
      .reply(200, {
        sha: '1234',
        size: secureConfig.length,
        content: secureConfig.toString('base64'),
      })
      .get('/repos/tripodsan/helix-pages-test/contents/?ref=devel')
      .reply(200, []);

    const purge = new Purge({
      HLX_PAGES_FASTLY_SVC_ID: 'test-service',
      HLX_PAGES_FASTLY_TOKEN: 'test-token',
      HLX_BOT_PRIVATE_KEY: await fse.readFile(TEST_PRIV_KEY_FILE),
      HLX_BOT_PRIVATE_KEY_PW: 'test',
      GH_APP_ID: '1234',
      GH_APP_PRIVATE_KEY: await fse.readFile(GH_PRIV_KEY_FILE),
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'devel',
    });
    const cfg = await purge.getPurgeConfig();
    assert.deepEqual(cfg.config, {
      branch: 'devel',
      caches: [{
        domains: ['foo.bar'],
        fastlyServiceId: '1234',
        fastlyToken: 'dummy',
      }, {
        domains: ['*.project-helix.page', '*.hlx.page'],
        fastlyServiceId: 'test-service',
        fastlyToken: 'test-token',
      }],
      version: 1,
    });
  });

  it('loads purge config via bot credentials but not bot installed', async () => {
    const data = yaml.dump({
      version: 1,
      branch: 'devel',
      caches: [{
        domains: ['foo.bar'],
        fastlyServiceId: '1234',
        fastlyToken: 'dummy',
      }],
    });

    const crypt = new Crypt()
      .withPrivateKey(TEST_PRIV_KEY_FILE)
      .withPrivateKeyPwd('test')
      .withPublicKey(TEST_PUB_KEY_FILE);

    const secureConfig = Buffer.from(await crypt.encrypt(data));

    nock('https://raw.githubusercontent.com')
      .get('/tripodsan/helix-pages-test/devel/helix-config.yaml')
      .reply(404)
      .get('/tripodsan/helix-pages-test/devel/.github/helix-bot.yaml.gpg')
      .reply(200, secureConfig);

    nock('https://api.github.com')
      .get('/repos/tripodsan/helix-pages-test/installation')
      .reply(404);

    const purge = new Purge({
      HLX_PAGES_FASTLY_SVC_ID: 'test-service',
      HLX_PAGES_FASTLY_TOKEN: 'test-token',
      HLX_BOT_PRIVATE_KEY: await fse.readFile(TEST_PRIV_KEY_FILE),
      HLX_BOT_PRIVATE_KEY_PW: 'test',
      GH_APP_ID: '1234',
      GH_APP_PRIVATE_KEY: await fse.readFile(GH_PRIV_KEY_FILE),
      owner: 'tripodsan',
      repo: 'helix-pages-test',
      ref: 'devel',
    });
    const cfg = await purge.getPurgeConfig();
    assert.deepEqual(cfg.config, {
      branch: 'devel',
      caches: [{
        domains: ['foo.bar'],
        fastlyServiceId: '1234',
        fastlyToken: 'dummy',
      }, {
        domains: ['*.project-helix.page', '*.hlx.page'],
        fastlyServiceId: 'test-service',
        fastlyToken: 'test-token',
      }],
      version: 1,
    });
  });
});
