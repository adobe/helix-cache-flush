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
const { wrap } = require('@adobe/openwhisk-action-utils');
const { logger } = require('@adobe/openwhisk-action-logger');
const { wrap: status } = require('@adobe/helix-status');
const { epsagon } = require('@adobe/helix-epsagon');
const { Change } = require('@adobe/helix-task-support');
const Fastly = require('@adobe/fastly-native-promises');
const { utils: { computeSurrogateKey } } = require('@adobe/helix-shared');

/**
 * Returns the source location of a OneDrive change event.
 * @param {Change} change A observation change event.
 * @param {ObservationEvent} observation the entire observation event.
 * @return {string} The source location or falsy if not possible to detect.
 *
 * todo: move to Change class ?
 */
function getOneDriveLocation(change, observation) {
  const { provider: { itemId } = {} } = change;
  const { provider: { driveId } = {} } = observation;
  if (!itemId || !driveId) {
    return '';
  }
  return `/drives/${driveId}/items/${itemId}`;
}

/**
 * Returns the generic source location of a change event.
 * @param {Change} change A observation change event.
 * @param {string} owner the repo owner.
 * @param {string} repo the repo name.
 * @param {string} ref the repo ref.
 * @return {string} The source location
 *
 * todo: move to Change class ?
 */
function getDefaultLocation(change, owner, repo, ref) {
  let { path } = change;
  // default location is always a markdown resource
  const lastSlash = path.lastIndexOf('/');
  const lastDot = path.lastIndexOf('.');
  if (lastSlash < lastDot) {
    path = `${path.substring(0, lastDot)}.md`;
  }
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}${path}`;
}

/**
 * Runtime action.
 *
 * @param {object} params parameters
 */
async function run(params) {
  const {
    owner, repo, ref, __ow_logger: log,
    observation,
  } = params;
  log.info(`received change event on ${owner}/${repo}/${ref}`, observation);

  if (!owner) {
    throw new Error('owner parameter missing.');
  }
  if (!repo) {
    throw new Error('repo parameter missing.');
  }
  if (!ref) {
    throw new Error('ref parameter missing.');
  }
  const change = Change.fromParams(params);

  let location = getOneDriveLocation(change, observation);
  // if (!location) {
  //   location = getGoogleDocsLocation(change, observation);
  // }
  if (!location) {
    location = getDefaultLocation(change, owner, repo, ref);
  }
  const key = computeSurrogateKey(location);
  log.info(`location: ${location}, surrogate key: ${key}`);

  // todo: check for helix-bot-config to read flush information from

  const {
    HLX_PAGES_FASTLY_SVC_ID: fastlyServiceId,
    HLX_PAGES_FASTLY_TOKEN: fastlyToken,
  } = params;

  if (!fastlyServiceId) {
    log.warn('unable to purge helix-pages cache. no HLX_PAGES_FASTLY_SVC_ID configured.');
    return {};
  }
  if (!fastlyToken) {
    log.warn('unable to purge helix-pages cache. no HLX_PAGES_FASTLY_TOKEN configured.');
    return {};
  }
  try {
    const svc = Fastly(fastlyToken, fastlyServiceId);
    const purgeResult = (await svc.softPurgeKeys([key]));
    log.info('helix-pages purge result: ', purgeResult.data);
  } catch (e) {
    log.error('helix-pages: error while accessing Fastly API', e);
  }

  return {};
}

module.exports.main = wrap(run)
  .with(epsagon)
  .with(status)
  .with(logger.trace)
  .with(logger);
