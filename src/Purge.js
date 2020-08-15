/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const { createAppAuth } = require('@octokit/auth-app');
const { Octokit } = require('@octokit/rest');
const { HelixBotConfig } = require('@adobe/helix-bot-shared');
const Fastly = require('@adobe/fastly-native-promises');
const HelixBotOptions = require('./HelixBotOptions.js');

class Purge {
  constructor(params) {
    this._params = params;
    // eslint-disable-next-line no-underscore-dangle
    this._log = params.__ow_logger || console;
    this._opts = new HelixBotOptions(params);
    this._repoName = `${params.owner}/${params.repo}/${params.ref}`;
  }

  get repoName() {
    return this._repoName;
  }

  get log() {
    return this._log;
  }

  /**
   * Adds the cache invalidation information for helix-pages to the given config.
   * @param {HelixBotConfig} cfg - Helix Bot Config.
   */
  setupHelixPagesConfig(cfg) {
    if (!this._opts.helixPagesFastlySvcId) {
      this.log.info('HLX_PAGES_FASTLY_SVC_ID not configured. Ignoring check for helix-pages repository.');
      return;
    }
    this.log.info('Adding cache invalidation info for helix pages.');
    cfg.putCache({
      fastlyServiceId: this._opts.helixPagesFastlySvcId,
      fastlyToken: this._opts.helixPagesFastlyToken,
      domains: ['*.project-helix.page', '*.hlx.page'],
    });
  }

  /**
   * Retrieves the installation id
   * @param {Octokit} octokit
   * @returns {string} the installation id
   */
  async getRepoInstallationId(octokit) {
    const { owner, repo } = this._params;
    try {
      const { data } = await octokit.apps.getRepoInstallation({
        owner,
        repo,
      });
      this.log.info(`${this.repoName} installation id = ${data.id}`);
      return data.id;
    } catch (e) {
      if (e.status === 404) {
        this.log.info(`helix-bot not installed on ${this.repoName}`);
        return '';
      }
      throw e;
    }
  }

  /**
   * Retrieves the purge config from the repository.
   * @returns {Promise<HelixBotConfig>} the bot config or {@code null} if not possible.
   */
  async getPurgeConfig() {
    const { owner, repo, ref } = this._params;
    const cfg = new HelixBotConfig()
      .withLogger(this.log)
      .withBotOptions(this._opts)
      .withRepoName(repo)
      .withRepoOwner(owner)
      .withRepoRef(ref);

    let octokit;
    if (this._opts.githubAppId && this._opts.githubAppPrivateKey) {
      const appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          id: this._opts.githubAppId,
          privateKey: this._opts.githubAppPrivateKey,
        },
      });
      const installationId = await this.getRepoInstallationId(appOctokit);

      // if we have an installation id, get an installation authenticated octokit
      if (installationId) {
        const { token } = await appOctokit.auth({
          type: 'installation',
          installationId,
        });
        octokit = new Octokit({
          auth: token,
        });
      }
    }
    await cfg.loadFromGithub(octokit);
    if (cfg.source) {
      // if config was loaded, verify the branch
      // ensure that the config denotes the correct branch
      const branch = cfg.getBranch();
      if (!branch) {
        this.log.info(`${this.repoName} no .github/helix-bot.yaml.gpg or no 'branch'' configured.`);
        return null;
      }

      if (ref !== branch) {
        this.log.info(`${this.repoName} pushed branch ${ref} does not match configured branch: ${branch}`);
        return null;
      }
    } else {
      cfg.setBranch(ref);
    }

    const isHelixPages = await cfg.isHelixPages(octokit);
    if (isHelixPages) {
      this.setupHelixPagesConfig(cfg);
    }
    return cfg;
  }

  async softPurgeKeys(cfg, surrogateKeys) {
    const { log, repoName } = this;
    await Promise.all(cfg.getCaches().map(async (cache, idx) => {
      if (!cache.fastlyServiceId) {
        log.warn(`${repoName}[${idx}] no fastlyServiceId configured.`);
        return;
      }
      if (!cache.fastlyToken) {
        log.warn(`${repoName}[${idx}] no fastlyToken configured.`);
        return;
      }
      const svc = Fastly(cache.fastlyToken, cache.fastlyServiceId);

      try {
        const domainInfo = cache.domains && cache.domains.length > 0 ? cache.domains.join(', ') : '';
        log.info(`${repoName}[${idx}] purging cache by keys of ${domainInfo} (${cache.fastlyServiceId})`);
        const purgeResult = (await svc.purgeKeys(surrogateKeys));
        log.info(`${repoName}[${idx}] purge result: `, purgeResult.data);
      } catch (e) {
        log.error(`${repoName}[${idx}] error while accessing Fastly API: ${e.stack}`);
      }
    }));
  }
}

module.exports = Purge;
