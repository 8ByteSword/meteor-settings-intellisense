# Meteor Settings IntelliSense

This Visual Studio Code extension provides hints and autocompletion for Meteor settings in your JavaScript and TypeScript files. It reads the `settings.json` file in your Meteor project and provides hover tooltips, code completion, and linting for accessing Meteor settings.

## Features

- **Hover Tooltips**: Hover over `Meteor.settings` keys to see their values and types.
- **Code Completion**: Get autocompletion suggestions for `Meteor.settings` keys and their values.
- **Linting**: Warns you if you try to access non-public settings in client code.
- **Links**: Ctrl + click a setting to go to that location in the `Meteor.settings`

## Usage

1. Install the extension in Visual Studio Code.
2. Open your Meteor project in Visual Studio Code.
3. Start using `Meteor.settings` in your JavaScript or TypeScript files, and the extension will provide hints and autocompletion.

## Configuration

You can configure the path to the `settings.json` file by setting the `meteorSettingsIntelliSense.settingsFilePath` option in your workspace settings. By default, it looks for `settings.json` in the workspace root.

## Contributing

If you find any issues or have suggestions for improvements, please open an issue or submit a pull request on the [GitHub repository](https://github.com/your-repo/meteor-settings-intellisense).

## License

This extension is licensed under the [MIT License](LICENSE).
