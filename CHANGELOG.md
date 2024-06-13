# Change Log

All notable changes to the "meteor-settings-hinting" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.2] - 2024-06-13
  ### Fixed
    - Duplicated keys exiting before the linting is done.

## [0.1.1] - 2024-06-13

### Added
  - Error highlighting when key doesn't exist on settings object.
  - Error highlighting when accessing non-public key from client code.
  - Added event listeners for edited files and updated settings when file is saved.
  - Error linting on already opened files when extension activates.

### Changed
  - Improved README.md with gifs for visual explanation and new features
  - Added error line in detail of hover and autocomplete when key shouldn't be accessed from client code
  

## [0.1.0] - 2024-06-12

### Added
  - Implemented file system watcher to monitor changes in the settings file.
  - Settings are now updated dynamically whenever the file changes.

### Changed
  - Updated the file path handling to use the workspace base directory.

### Fixed
  - Resolved an issue where settings weren't being updated when the file changed.



## [0.0.3]

### Fixed
    - Settings file path now works properly
    - Settings are now updated when configurations file changes

## [0.0.2]

### Added 
    - ctrl + click functionality: Ctrl + click a setting to go to that location in the `Meteor.settings`

## [0.0.1]

- Initial release
- Hover on Meteor settings to show the values
- Code completion for Meteor settings