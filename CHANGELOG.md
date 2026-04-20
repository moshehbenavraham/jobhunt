# Changelog

## 1.0.0 (2026-04-20)


### Features

* adapt contacto mode by contact type (recruiter/HM/peer/interviewer) ([9fd5a90](https://github.com/moshehbenavraham/jobhunt/commit/9fd5a90896f20020f48455cd079b64fed491b89f))
* add --min-score flag to batch runner ([#249](https://github.com/moshehbenavraham/jobhunt/issues/249)) ([cb0c7f7](https://github.com/moshehbenavraham/jobhunt/commit/cb0c7f7d7d3b9f3f1c3dc75ccac0a08d2737c01e))
* add {{PHONE}} placeholder to CV template ([#287](https://github.com/moshehbenavraham/jobhunt/issues/287)) ([e71595f](https://github.com/moshehbenavraham/jobhunt/commit/e71595f8ba134971ecf1cc3c3420d9caf21eed43))
* add Block G — posting legitimacy assessment ([3a636ac](https://github.com/moshehbenavraham/jobhunt/commit/3a636ac586659bb798ef46a0a9798478a1e28b0a))
* add cron installer and human review guidance ([2f0fb08](https://github.com/moshehbenavraham/jobhunt/commit/2f0fb08516a7ef708524446e89ac06b094d6cddc))
* add dashboard launcher and bump version to 1.5.29 ([ba97be1](https://github.com/moshehbenavraham/jobhunt/commit/ba97be125851b89dfb659ce38e207941773ab264))
* add follow-up cadence tracker mode ([4308c37](https://github.com/moshehbenavraham/jobhunt/commit/4308c375033c6df430308235f4324658a8353b81))
* add GitHub Actions CI + auto-labeler + welcome bot + /run skill ([2ddf22a](https://github.com/moshehbenavraham/jobhunt/commit/2ddf22a6a2731b38bcaed5786c4855c4ab9fe722))
* add Nix flake devshell with Playwright support ([c579fcd](https://github.com/moshehbenavraham/jobhunt/commit/c579fcddebf793f00cfad8534fd74085c09017fb))
* add OpenCode slash commands for career-ops ([#67](https://github.com/moshehbenavraham/jobhunt/issues/67)) ([93caaed](https://github.com/moshehbenavraham/jobhunt/commit/93caaed49cbc9f3214f9beb66fb2281c3f2370e6))
* add scan.mjs — zero-token portal scanner ([8c19b2b](https://github.com/moshehbenavraham/jobhunt/commit/8c19b2b59f7087689e004f3d48e912f291911373))
* advance dashboard work and phase 01 closeout ([6fdc3cc](https://github.com/moshehbenavraham/jobhunt/commit/6fdc3ccb6257ed9f6fb7c78dbb44a4179ffda644))
* **dashboard:** add Catppuccin Latte light theme with auto-detection ([ff686c8](https://github.com/moshehbenavraham/jobhunt/commit/ff686c8af97a7bf93565fe8eeac677f998cc9ece))
* **dashboard:** add manual refresh shortcut ([#246](https://github.com/moshehbenavraham/jobhunt/issues/246)) ([4b5093a](https://github.com/moshehbenavraham/jobhunt/commit/4b5093a8ef1733c449ec0821f722f996625fcb84))
* **dashboard:** add progress analytics screen ([623c837](https://github.com/moshehbenavraham/jobhunt/commit/623c837bf3155fd5b7413554240071d40585dd7e))
* **dashboard:** add vim motions to pipeline screen ([#262](https://github.com/moshehbenavraham/jobhunt/issues/262)) ([d149e54](https://github.com/moshehbenavraham/jobhunt/commit/d149e541402db0c88161a71c73899cd1836a1b2d))
* **dashboard:** aligned tables and markdown syntax rendering in viewer ([dbd1d3f](https://github.com/moshehbenavraham/jobhunt/commit/dbd1d3f7177358d0384d6e661d1b0dfc1f60bd4e))
* expand portals.example.yml with 8 dev-tools companies + 23 search queries ([#140](https://github.com/moshehbenavraham/jobhunt/issues/140)) ([b7f555d](https://github.com/moshehbenavraham/jobhunt/commit/b7f555d7b9a7b23c875fa0d35584df534961dabe))
* **i18n:** add Japanese README + language modes for Japan market ([20a2c81](https://github.com/moshehbenavraham/jobhunt/commit/20a2c817486968ca42a534aa86838c797d599c10))
* import upstream latex export and CI fixes ([3b99c7b](https://github.com/moshehbenavraham/jobhunt/commit/3b99c7b7eabf47ffea5301da4cdbee726460fffd))
* refine dashboard progress data ([bf8915c](https://github.com/moshehbenavraham/jobhunt/commit/bf8915cfde2217219098953dec7af79e2b50fd7c))
* tighten auto-pipeline ATS extraction flow ([c8d5ad4](https://github.com/moshehbenavraham/jobhunt/commit/c8d5ad470e3799f81f123d9c80d31895d2572a7b))


### Bug Fixes

* 10 bug fixes — resource leaks, command injection, Unicode, navigation ([cb01a2c](https://github.com/moshehbenavraham/jobhunt/commit/cb01a2c2e3b7fc334b1c4594749ea40b0da8fc62))
* add data/ fallback to UpdateApplicationStatus ([#55](https://github.com/moshehbenavraham/jobhunt/issues/55)) ([3512b8e](https://github.com/moshehbenavraham/jobhunt/commit/3512b8ef4eb8ca967bc967664f8798af42b58a52))
* add stopword filtering and overlap ratio to roleMatch ([#248](https://github.com/moshehbenavraham/jobhunt/issues/248)) ([4da772d](https://github.com/moshehbenavraham/jobhunt/commit/4da772d3a4996bc9ecbe2d384d1e9d2ed75b9819))
* align portals.example.yml indentation for new companies ([26a6751](https://github.com/moshehbenavraham/jobhunt/commit/26a675173e64dac09fd1524ff9a7c7061520e057))
* **ci:** use pull_request_target for labeler on fork PRs ([#260](https://github.com/moshehbenavraham/jobhunt/issues/260)) ([2ecf572](https://github.com/moshehbenavraham/jobhunt/commit/2ecf57206c2eb6e35e2a843d6b8365f7a04c53d6))
* correct _shared.md → _profile.md reference in CUSTOMIZATION.md (closes [#137](https://github.com/moshehbenavraham/jobhunt/issues/137)) ([a91e264](https://github.com/moshehbenavraham/jobhunt/commit/a91e264b6ea047a76d8c033aa564fe01b8f9c1d9))
* correct dashboard launch path in docs ([#80](https://github.com/moshehbenavraham/jobhunt/issues/80)) ([2b969ee](https://github.com/moshehbenavraham/jobhunt/commit/2b969eea5f6bbc8f29b9e42bedb59312379e9f02))
* **dashboard:** show dates in pipeline list ([#298](https://github.com/moshehbenavraham/jobhunt/issues/298)) ([e5e2a6c](https://github.com/moshehbenavraham/jobhunt/commit/e5e2a6cffe9a5b9f3cec862df25410d02ecc9aa4))
* ensure data/ and output/ dirs exist before writing in scripts ([#261](https://github.com/moshehbenavraham/jobhunt/issues/261)) ([4b834f6](https://github.com/moshehbenavraham/jobhunt/commit/4b834f6f7f8f1b647a6bf76e43b017dcbe9cd52f))
* filter expired WebSearch links before they reach the pipeline ([#57](https://github.com/moshehbenavraham/jobhunt/issues/57)) ([ce1c5a3](https://github.com/moshehbenavraham/jobhunt/commit/ce1c5a3c7eea6ebce2c90aebba59d6e26b790d3f))
* improve default PDF readability ([#85](https://github.com/moshehbenavraham/jobhunt/issues/85)) ([10034ec](https://github.com/moshehbenavraham/jobhunt/commit/10034ec3304c1c79ff9c9678c7826ab77c0bcbf7))
* liveness checks ignore nav/footer Apply text, expired signals win ([3a3cb95](https://github.com/moshehbenavraham/jobhunt/commit/3a3cb95bdf09235509df72e30b3077623f571ea1))
* remove wellfound, lever and remotefront from portals.example.yml ([#286](https://github.com/moshehbenavraham/jobhunt/issues/286)) ([ecd013c](https://github.com/moshehbenavraham/jobhunt/commit/ecd013cc6f59e3a1a8ef77d34e7abc15e8075ed3))
* replace grep -P with POSIX-compatible grep in batch-runner.sh ([637b39e](https://github.com/moshehbenavraham/jobhunt/commit/637b39e383d1174c8287f42e9534e9e3cdfabb19))
* support bare tracker report paths and bump version to 1.5.30 ([6ec8efb](https://github.com/moshehbenavraham/jobhunt/commit/6ec8efb7347a38ab1fd4f6726bad22f4664bcac3))
* test-all.mjs scans only git-tracked files, avoids false positives ([47c9f98](https://github.com/moshehbenavraham/jobhunt/commit/47c9f984d8ddc70974f15c99b081667b73f1bb9a))
* use candidate name from profile.yml in PDF filename ([7bcbc08](https://github.com/moshehbenavraham/jobhunt/commit/7bcbc08ca6184362398690234e49df0ac157567f))
* use execFileSync to prevent shell injection in test-all.mjs ([c99d5a6](https://github.com/moshehbenavraham/jobhunt/commit/c99d5a6526f923b56c3790b79b0349f402fa00e2))
* use fileURLToPath for cross platform compatible paths in tracker scripts ([#32](https://github.com/moshehbenavraham/jobhunt/issues/32)) ([#58](https://github.com/moshehbenavraham/jobhunt/issues/58)) ([ab77510](https://github.com/moshehbenavraham/jobhunt/commit/ab775102f4586ae4663a593b519927531be27122))
* use hi@santifer.io in English README ([5518d3d](https://github.com/moshehbenavraham/jobhunt/commit/5518d3dd07716137b97bb4d8c7b5264b94e2b9e9))


### Performance Improvements

* compress hero banner from 5.7MB to 671KB ([dac4259](https://github.com/moshehbenavraham/jobhunt/commit/dac425913620fe0a66916dda7ba8d8fc4c427d51))
