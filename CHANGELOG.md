# [2.0.0](https://github.com/sinedied/dmx-hue/compare/1.4.2...2.0.0) (2023-06-28)


### Bug Fixes

* add missing white control prompt during setup ([a7910b0](https://github.com/sinedied/dmx-hue/commit/a7910b02d584f25f5f95fe2f25eed7a53f4413b8))
* argument fallback (fixes || does not work if first value is 0 and second is 1. [#26](https://github.com/sinedied/dmx-hue/issues/26)) ([b309903](https://github.com/sinedied/dmx-hue/commit/b3099037c666c9cbf9b891c9d353e6a805ca16f8))
* crash when colorloop is enabled ([8eece1e](https://github.com/sinedied/dmx-hue/commit/8eece1ed0424c532245a2db746ca039e708786b1))
* parameters restore during config ([074c211](https://github.com/sinedied/dmx-hue/commit/074c211bb54e5f3a056823657d48607a0e3386cc))


* chore!: remove --no-limit option ([dc0a231](https://github.com/sinedied/dmx-hue/commit/dc0a231e3c90660734093a1bff58947fb9bc4ba6))
* refactor!: migrate to esm ([b5815d6](https://github.com/sinedied/dmx-hue/commit/b5815d66275c402ce9ba9bcca3ad414597c920e8))


### Features

* add --white option for optional white balance control ([03aba91](https://github.com/sinedied/dmx-hue/commit/03aba9123d5c4a7babe25e4aa828a5dfe146f7c0))
* add white balance support ([#30](https://github.com/sinedied/dmx-hue/issues/30)) ([fc71e98](https://github.com/sinedied/dmx-hue/commit/fc71e9820452cde46da2c18075ad17b84f921cfc))
* allow other ART-NET apps on same machine ([#35](https://github.com/sinedied/dmx-hue/issues/35)) ([d78dd48](https://github.com/sinedied/dmx-hue/commit/d78dd4897e79a9b873226af769f5249e69b18d36))
* allow selection when multiple bridges are found ([e07d569](https://github.com/sinedied/dmx-hue/commit/e07d569cd679611f8e2bdf54e4f0201fef35cf44))
* update hue api ([734d700](https://github.com/sinedied/dmx-hue/commit/734d700076ca5a967e7d175f5302374bda204095))


### Reverts

* Revert "chore!: remove --no-limit option" ([f1fdadb](https://github.com/sinedied/dmx-hue/commit/f1fdadb05e43692a54e54a96a527026afb0acceb))


### BREAKING CHANGES

* remove --no-limit option
* Requires Node >= 16

## [1.4.2](https://github.com/sinedied/dmx-hue/compare/1.4.1...1.4.2) (2021-07-06)


### Bug Fixes

* correct hue-dmx to dmx-hue ([373e81c](https://github.com/sinedied/dmx-hue/commit/373e81c8c9a02848acfe3b6069072fa788fd023a))

# 1.4.1
- Fix artnet universe 0 not being accepted during setup (PR #21)

# 1.4.0
- Add lights update order randomization (PR #17)

# 1.3.2
- Allow to force bridge IP even if no bridges are detected

# 1.3.1
- Fixed stuck colorloop effect

# 1.3.0
- Added lights mapping order customization
- Added colors to command-line output

# 1.2.0
- Added Art-Net universe option
- Fixed some bugs during setup

# 1.1.2
- Fixed docs

# 1.1.1
- Fixed DMX adresses starting at 0 instead of 1

# 1.1.0
- Added option to disable safety rate limiting

# 1.0.1
- Fixed rate limiting issue

# 1.0.0
- Initial version
