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
/* eslint-disable no-console */
const path = require('path');
const { ActionBuilder } = require('@adobe/openwhisk-action-builder');
const Purge = require('../../src/Purge');

async function run() {
  const builder = new ActionBuilder();
  builder.withParamsFile(path.resolve(__dirname, '..', '..', 'secrets', 'secrets.env'));
  // eslint-disable-next-line no-underscore-dangle
  const params = await ActionBuilder.resolveParams(builder._params);
  // params.repo = 'helix-pages-test';
  params.repo = 'hlxtest-pages';
  // params.repo = 'hlxtest';
  // params.repo = 'theblog';
  params.owner = 'tripodsan';
  // params.owner = 'adobe';
  params.ref = 'master';
  // params.ref = 'staging';

  const purge = new Purge(params);
  const cfg = await purge.getPurgeConfig();
  console.log(cfg.toYAML());
  await purge.softPurgeKeys(cfg, ['a']);
}

run().catch(console.error);
