const vscode = require('vscode');
const parseSettings = require('./parseSettings');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Congratulations, your extension "meteor-settings-intellisense" is now active!');
  // Function to load settings
  function loadSettings() {
    const { workspaceFolders } = vscode.workspace;
    let settings = {};
    if (workspaceFolders) {
      const baseDir = workspaceFolders[0].uri.fsPath;
      const settingsFilePath = vscode.workspace.getConfiguration('meteorSettingsIntelliSense').get('settingsFilePath');
      settings = parseSettings.readSettings(baseDir, settingsFilePath);
      console.log('Loaded settings:', settings);
    } else {
      console.log('No workspace folder open.');
    }
    return settings;
  }

  // Initial load of settings
  let settings = loadSettings();

  // Register a command to test the settings parsing
  const testSettingsCommand = vscode.commands.registerCommand('meteor-settings-intellisense.testSettingsParsing', () => {
    const { workspaceFolders } = vscode.workspace;
    if (workspaceFolders) {
      vscode.window.showInformationMessage(`Parsed settings: ${JSON.stringify(settings, null, 2)}`);
    } else {
      vscode.window.showInformationMessage('No workspace folder open.');
    }
  });

  context.subscriptions.push(testSettingsCommand);

  // Example of using the settings for linting and hover tooltips
    console.log('Loaded settings Here:', settings);

    // Register a hover provider
    const hoverProvider = vscode.languages.registerHoverProvider(
      [
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' },
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
      ],
      {
        provideHover(document, position, token) {
          const range = document.getWordRangeAtPosition(position, /Meteor\.settings\.[\w.]+/);
          if (range) {
            const fullWord = document.getText(range);
            const hoveredWord = document.getText(document.getWordRangeAtPosition(position));
            const keys = fullWord.split('.').slice(2); // Remove 'Meteor.settings'

            let value = settings;
            let keyPath = 'Meteor.settings';
            keys.every((key) => {
              keyPath += `.${key}`;
              if (key === hoveredWord) {
                if (value[key] !== undefined) {
                  value = value[key]; return false;
                }
                value = undefined;
              } else if (value[key] !== undefined) {
                value = value[key]; return true;
              }
              value = undefined;
              return false;
            });

            if (value !== undefined) {
              const isClientFolder = document.uri.fsPath.includes('client');
              const isPublicKey = fullWord.startsWith('Meteor.settings.public.');
              let type = typeof value;
              if (Array.isArray(value)) {
                type = 'array';
              } else if (type === 'object') {
                type = 'object';
              }

              let hoverMessage = `**${keyPath}** (${type}): \n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;

              if (isClientFolder && !isPublicKey) {
                hoverMessage = `**Warning: Accessing non-public key in client code.**\n\n${hoverMessage}`;
              }

              return new vscode.Hover(new vscode.MarkdownString(hoverMessage));
            }
          }
          return null;
        },
      },
    );

    context.subscriptions.push(hoverProvider);
    // Register a completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      [
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' },
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
      ],
      {
        provideCompletionItems(document, position, token, context) {
          const linePrefix = document.lineAt(position).text.substr(0, position.character);
          const match = linePrefix.match(/Meteor\.settings(\.\w+)*\.?$/);
          if (!match) {
            return undefined;
          }

          const isClientFolder = document.uri.fsPath.includes('client');
          const completionItems = [];

          function addCompletionItems(obj, parentKey, currentKey) {
            Object.keys(obj).forEach((key, index) => {
              if (isClientFolder && parentKey === 'Meteor.settings' && key !== 'public') {
                return;
              }
              if (currentKey !== undefined && !key.startsWith(currentKey)) return;
              let completionItemKind = vscode.CompletionItemKind.Field;
              let detail = '';
              let documentation = '';

              if (typeof obj[key] === 'object' && obj[key] !== null) {
                completionItemKind = vscode.CompletionItemKind.Module;
                detail = 'Object';
                documentation = `An object with properties: \n\`\`\`json\n${JSON.stringify(obj[key], null, 2)}\n\`\`\``;
              } else if (typeof obj[key] === 'string') {
                completionItemKind = vscode.CompletionItemKind.Text;
                detail = 'String';
                documentation = `A string value: "${obj[key]}"`;
              } else if (typeof obj[key] === 'number') {
                completionItemKind = vscode.CompletionItemKind.Number;
                detail = 'Number';
                documentation = `A number value: ${obj[key]}`;
              } else if (Array.isArray(obj[key])) {
                completionItemKind = vscode.CompletionItemKind.Enum;
                detail = 'Array';
                documentation = `An array with elements: \n\`\`\`json\n${JSON.stringify(obj[key], null, 2)}\n\`\`\``;
              }

              const label = `${parentKey ? `${parentKey}` : ''}${key}`;
              const completionItem = new vscode.CompletionItem(label, completionItemKind);
              completionItem.detail = detail;
              completionItem.documentation = new vscode.MarkdownString(documentation);
              completionItem.range = new vscode.Range(
                position.translate(0, -match[0].length),
                position,
              );
              completionItem.sortText = String(index).padStart(5, '0');
              completionItems.push(completionItem);
              // console.log(`Key added: ${key}`);
            });
          }

          const settingsPath = match[0].split('.').slice(2);
          const wordRange = document.getWordRangeAtPosition(position);
          const currentKey = wordRange ? document.getText(wordRange) : '';
          let currentSettings = settings;
          settingsPath.every((key) => {
            if (currentSettings[key] !== undefined) {
              currentSettings = currentSettings[key];
              return true;
            } if (key === currentKey || key === '') {
              return false;
            }
            currentSettings = null;
            return false;
          });
          console.log(`Current key: ${currentKey}`);
          if (currentSettings !== null && typeof currentSettings === 'object') {
            addCompletionItems(currentSettings, match[0], currentKey);
          }
          console.log('Completion items:', completionItems);
          return completionItems;
        },
      },
      '.', // Trigger completion on '.'
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), // Trigger completion on all alphabetic characters
    );

    context.subscriptions.push(completionProvider);

    // Register link provider
    const linkProvider = vscode.languages.registerDocumentLinkProvider(
      [
          { scheme: 'file', language: 'javascript' },
          { scheme: 'file', language: 'javascriptreact' },
          { scheme: 'file', language: 'typescript' },
          { scheme: 'file', language: 'typescriptreact' },
      ],
      {
          provideDocumentLinks(doc) {
              const links = [];
              const text = doc.getText();
              const pattern = /Meteor\.settings\.[\w.]+/g;
              let match;
              const workspaceFolders = vscode.workspace.workspaceFolders;
              const baseDir = workspaceFolders[0].uri.fsPath;
              const settingsFilePath = vscode.workspace.getConfiguration('meteorSettingsIntelliSense').get('settingsFilePath');
              const settingsPath = `${baseDir}/${settingsFilePath}`;

              const wordLocations = {};

              const createLink = (key) => {
                const start = match.index + match[0].indexOf(key);
                const docStart = doc.positionAt(start);
                const end = start + key.length;
                const docEnd = doc.positionAt(end);
                const range = new vscode.Range(docStart, docEnd);
    
                let line; let pos;
                if (!wordLocations[key]) {
                  [line, pos] = parseSettings.getSettingPosition(baseDir, settingsFilePath, key);
                  wordLocations[key] = [line, pos];
                } else [line, pos] = wordLocations[key];
    
                let uri = vscode.Uri.file(settingsPath);
                if (line && pos) {
                  uri = uri.with({ fragment: `L${line + 1},${pos + 1}` });
                } else if(key !== 'settings') return;
    
                const link = new vscode.DocumentLink(range, uri);
                links.push(link);
              };
    

              while ((match = pattern.exec(text)) !== null) {
                  const keys = match[0].split('.').slice(1); // Remove 'Meteor'

                  keys.forEach(createLink)
              }

              return links;
          },
      }
  );

    context.subscriptions.push(linkProvider);

    // Listen for configuration changes
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('meteorSettingsIntelliSense.settingsFilePath')) {
      console.log('Settings file path changed, reloading settings...');
      settings = loadSettings();
    }
  });
  }


function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
