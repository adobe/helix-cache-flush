# Helix Cache Flush Service

> The `helix-cache-flush` service is an OpenWhisk action that can be registered as helix observation task. It will react on content changes via the observation service and notify the inner CDN with cache purge requests.

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-cache-flush.svg)](https://codecov.io/gh/adobe/helix-cache-flush)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-cache-flush.svg)](https://circleci.com/gh/adobe/helix-cache-flush)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-cache-flush.svg)](https://github.com/adobe/helix-cache-flush/blob/main/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-cache-flush.svg)](https://github.com/adobe/helix-cache-flush/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-cache-flush.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-cache-flush)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

## Usage

```bash
curl https://adobeioruntime.net/api/v1/web/helix/helix-observation/cache-flush@v1
```

## Development

### Deploying Helix Cache Flush Service

Deploying Helix Cache Flush Service requires the `wsk` command line client, authenticated to a namespace of your choice. For Project Helix, we use the `helix` namespace.

All commits to main that pass the testing will be deployed automatically. All commits to branches that will pass the testing will get deployed as `/helix/helix-observation/cache-flush@ci<num>` and tagged with the CI build number.
