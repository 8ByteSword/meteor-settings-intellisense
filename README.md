# Meteor Settings IntelliSense

This Visual Studio Code extension provides hints and autocompletion for Meteor settings in your JavaScript and TypeScript files. It reads the `settings.json` file in your Meteor project and provides hover tooltips, code completion, and linting for accessing Meteor settings.

## Features

### Hover Tooltips
Hover over `Meteor.settings` keys to see their values and types. This helps you understand what each setting represents and its data type.

<img src="https://imgur.com/Q7xDYEL.gif" width="480" alt="Hover function">

### Code Completion
Get autocompletion suggestions for `Meteor.settings` keys and their values. As you type, the extension will provide a list of available settings and their values, making it easier to access and use them in your code.

<img src="https://imgur.com/l7M3smv.gif" width="480" alt="Code completion">


### Non public key from client
The extension warns you if you try to access non-public settings in client code. This helps prevent accidental exposure of sensitive data and ensures that your code follows best practices for accessing Meteor settings.

<img src="https://imgur.com/EceVS7U.gif" width="480" alt="Non public key from client">

### Links
Ctrl + click a setting to go to that location in the `Meteor.settings`. This feature allows you to quickly navigate to the definition of a setting, making it easier to understand and modify its value.

<img src="https://imgur.com/VX6aZvq.gif" width="480" alt="Ctrl + click feature ">

## Usage

1. Install the extension in Visual Studio Code.
2. Open your Meteor project in Visual Studio Code.
3. Start using `Meteor.settings` in your JavaScript or TypeScript files, and the extension will provide hints and autocompletion.

## Configuration

You can configure the path to the `settings.json` file by setting the `meteorSettingsIntelliSense.settingsFilePath` option in your workspace settings. By default, it looks for `settings.json` in the workspace root.


<img src="https://imgur.com/DgPhELZ.gif" width="480" alt="Settings file path">

## Contributing

If you find any issues or have suggestions for improvements, please open an issue or submit a pull request on the [GitHub repository](https://github.com/8ByteSword/meteor-settings-intellisense).

## License

This extension is licensed under the [MIT License](LICENSE).
