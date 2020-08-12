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
const { HelixBotOptions } = require('@adobe/helix-bot-shared');

class ExtendedBotOptions extends HelixBotOptions {
  constructor(params) {
    super(params);
    this._helixPagesFastlySvcId = params.HLX_PAGES_FASTLY_SVC_ID;
    this._helixPagesFastlyToken = params.HLX_PAGES_FASTLY_TOKEN;
  }

  get helixPagesFastlySvcId() {
    return this._helixPagesFastlySvcId;
  }

  get helixPagesFastlyToken() {
    return this._helixPagesFastlyToken;
  }
}

module.exports = ExtendedBotOptions;
