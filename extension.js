
const vscode = require('vscode');
const parseSettings = require('./parseSettings');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Congratulations, your extension "meteor-settings-intellisense" is now active!');

  function updateAllDiagnostics() {
    vscode.workspace.textDocuments.forEach(document => {
      if (document.languageId === 'javascript' || document.languageId === 'javascriptreact') {
        diagnosticsCollection.delete(document.uri);
        updateDiagnostics(document, settings);
      }
    });
  }

  let settings = {};
  let settingsWatcher;

  // Function to create a file system watcher for the settings file
  function createSettingsWatcher(context) {
    const { workspaceFolders } = vscode.workspace;
    const settingsFilePath = vscode.workspace.getConfiguration('meteorSettingsIntelliSense').get('settingsFilePath');
    const baseDir = workspaceFolders[0].uri.fsPath;
    const filePath = path.isAbsolute(settingsFilePath)
      ? settingsFilePath
      : path.join(baseDir, settingsFilePath);
    if (settingsWatcher) {
      settingsWatcher.dispose();
    }

    settingsWatcher = vscode.workspace.createFileSystemWatcher(filePath);

    settingsWatcher.onDidChange(() => {
      console.log('Settings file changed, reloading settings...');
      loadSettings();
      updateAllDiagnostics();
    });

    settingsWatcher.onDidCreate(() => {
      console.log('Settings file created, loading settings...');
      updateAllDiagnostics();
      loadSettings();
    });

    settingsWatcher.onDidDelete(() => {
      console.log('Settings file deleted, clearing settings...');
      settings = {};
      updateAllDiagnostics();
    });

    context.
      subscriptions.push(settingsWatcher);
  }

  // Function to load settings
  function loadSettings() {
    const { workspaceFolders } = vscode.workspace;
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
  settings = loadSettings();
  createSettingsWatcher(context);

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

  const diagnosticsCollection = vscode.languages.createDiagnosticCollection('meteorSettings');

  function updateDiagnostics(document, settings) {
    const diagnostics = [];
    const text = document.getText();
    const meteorSettingsPattern = /Meteor\.settings\.[\w.]+/g;
    const destructuringPattern = /(?:const|let|var)\s*{\s*([^}]+)\s*}\s*=\s*(Meteor\.settings(?:\.\w+)*)/g;
    let match;

    while ((match = meteorSettingsPattern.exec(text)) !== null) {
      const keys = match[0].split('.').slice(2); // get keys after Meteor.settings
      let currentSettings = settings;
      let exists = true;
      keys.forEach(key => {
        if (currentSettings && typeof currentSettings === 'object' && (key in currentSettings)) {
          currentSettings = currentSettings[key];
        } else {
          exists = false;
        }
      });

      const isPublic = match[0].startsWith('Meteor.settings.public');
      const isClientFolder = document.uri.fsPath.includes('client');

      if (isClientFolder && !isPublic) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length)),
          'Accessing non-public Meteor settings from client code.',
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      }

      if (!exists) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length)),
          'Meteor settings key does not exist.',
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      }
    }
    // New check for destructured assignments
    while ((match = destructuringPattern.exec(text)) !== null) {
      const destructuredVars = match[1].split(',').map(v => v.trim());
      const settingsPath = match[2].split('.').slice(2); // Remove 'Meteor' and 'settings'
      let currentSettings = settings;

      // Traverse the settings object
      for (const key of settingsPath) {
        if (currentSettings && typeof currentSettings === 'object' && key in currentSettings) {
          currentSettings = currentSettings[key];
        } else {
          currentSettings = null;
          break;
        }
      }

      // Check each destructured variable
      const lineText = document.lineAt(document.positionAt(match.index)).text;
      destructuredVars.forEach(variable => {
        const variableStart = lineText.indexOf(variable, match.index - document.offsetAt(document.positionAt(match.index).with({ character: 0 })));
        if (variableStart !== -1) {
          const variableRange = new vscode.Range(
            document.positionAt(document.offsetAt(document.positionAt(match.index).with({ character: 0 })) + variableStart),
            document.positionAt(document.offsetAt(document.positionAt(match.index).with({ character: 0 })) + variableStart + variable.length)
          );

          if (!currentSettings || typeof currentSettings !== 'object' || !(variable in currentSettings)) {
            const diagnostic = new vscode.Diagnostic(
              variableRange,
              `Destructured key '${variable}' does not exist in Meteor settings.`,
              vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
          }

          // Check for non-public settings in client code
          const isClientFolder = document.uri.fsPath.includes('client');
          const isPublic = match[2].includes('Meteor.settings.public');
          if (isClientFolder && !isPublic) {
            const diagnostic = new vscode.Diagnostic(
              variableRange,
              'Accessing non-public Meteor settings from client code.',
              vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
          }
        }
      });
    }
    diagnosticsCollection.set(document.uri, diagnostics);
  }

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
          const relativeHoveredPosition = position.e - range.start.e;

          const keys = fullWord.split('.').slice(2); // Remove 'Meteor.settings'

          let relativePosition = "Meteor.settings".length;
          let value = settings;
          let keyPath = 'Meteor.settings';

          keys.every((key) => {
            keyPath += `.${key}`;
            if (key === hoveredWord && (relativePosition + key.length + 1) >= relativeHoveredPosition) {
              if (value[key] !== undefined) {
                value = value[key]; return false;
              }
              value = undefined;
            } else if (value[key] !== undefined) {
              value = value[key];
              relativePosition += (key.length + 1); // the key and the '.'
              return true;
            }
            value = undefined;
            return false;
          });

          if (value !== undefined) {
            const content = new vscode.MarkdownString()
            const isClientFolder = document.uri.fsPath.includes('client');
            const isPublicKey = fullWord.startsWith('Meteor.settings.public');
            let type = typeof value;
            if (Array.isArray(value)) {
              type = 'array';
            } else if (type === 'object') {
              type = 'object';
            }


            if (isClientFolder && !isPublicKey) {
              content.appendMarkdown(`<span style="color:#c71c1cdb;"><b>Warning: Accessing non-public key in client code.</b></span> \n`);
            }
            content.appendMarkdown(`\n **${keyPath}** (${type}): \n`)
            content.appendCodeblock(JSON.stringify(value, null, 2), 'json');
            content.supportHtml = true;
            content.isTrusted = true;
            return new vscode.Hover(content, range);
          }
        } else {
          // Updated code to handle destructured variables
          const lineText = document.lineAt(position.line).text;
          const destructuringMatch = lineText.match(/(?:const|let|var)\s*{\s*([^}]+)\s*}\s*=\s*(Meteor\.settings(?:\.\w+)*)/);

          if (destructuringMatch) {
            const destructuredVars = destructuringMatch[1].split(',').map(v => v.trim());
            const settingsPath = destructuringMatch[2].split('.').slice(2); // Remove 'Meteor' and 'settings'
            const hoveredWord = document.getText(document.getWordRangeAtPosition(position));

            if (destructuredVars.includes(hoveredWord)) {
              let value = settings;
              for (const key of settingsPath) {
                if (value && typeof value === 'object' && key in value) {
                  value = value[key];
                } else {
                  value = undefined;
                  break;
                }
              }

              const content = new vscode.MarkdownString();
              const isClientFolder = document.uri.fsPath.includes('client');
              const isPublicKey = settingsPath[0] === 'public';

              if (isClientFolder && !isPublicKey) {
                content.appendMarkdown(`<span style="color:#c71c1cdb;"><b>Warning: Accessing non-public key in client code.</b></span> \n`);
              }

              if (value && typeof value === 'object' && hoveredWord in value) {
                const hoverValue = value[hoveredWord];
                let type = typeof hoverValue;
                if (Array.isArray(hoverValue)) {
                  type = 'array';
                } else if (type === 'object') {
                  type = 'object';
                }

                content.appendMarkdown(`\n **${destructuringMatch[2]}.${hoveredWord}** (${type}): \n`)
                content.appendCodeblock(JSON.stringify(hoverValue, null, 2), 'json');
              } else {
                content.appendMarkdown(`\n **Error**: The key '${hoveredWord}' does not exist in ${destructuringMatch[2]}.`);
              }

              content.supportHtml = true;
              content.isTrusted = true;
              return new vscode.Hover(content, document.getWordRangeAtPosition(position));
            }
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

        function addCompletionItems(obj, parentKey, currentKey, isClientFolder) {
          Object.keys(obj).forEach((key, index) => {
            if (currentKey !== undefined && !key.startsWith(currentKey)) return;
            let completionItemKind;
            let detail = '';
            let sortText = String(index).padStart(5, '0');
            const documentation = new vscode.MarkdownString();
            documentation.isTrusted = true;
            documentation.supportHtml = true;
            const fullKeyPath = `${parentKey ? `${parentKey}` : ''}${key}`;
            if (isClientFolder && !fullKeyPath.startsWith('Meteor.settings.public')) {
              documentation.appendMarkdown(`<span style="color:#c71c1cdb;"><b>⚠️ Warning: Accessing non-public key in client code.</b></span> \n\n`);
              sortText = '99999'; // Push to the end of the list
            }

            if (typeof obj[key] === 'object' && obj[key] !== null) {
              completionItemKind = vscode.CompletionItemKind.Module;
              detail = 'Object';
              documentation.appendMarkdown(`An object with properties: \n`);
              documentation.appendCodeblock(JSON.stringify(obj[key], null, 2), 'json');
            } else if (typeof obj[key] === 'string') {
              completionItemKind = vscode.CompletionItemKind.Text;
              detail = 'String';
              documentation.appendMarkdown(`A string value: "${obj[key]}"`);
            } else if (typeof obj[key] === 'number') {
              completionItemKind = vscode.CompletionItemKind.Number;
              detail = 'Number';
              documentation.appendMarkdown(`A number value: ${obj[key]}`);
            } else if (Array.isArray(obj[key])) {
              completionItemKind = vscode.CompletionItemKind.Enum;
              detail = 'Array';
              documentation.appendMarkdown(`An array with elements: \n`);
              documentation.appendCodeblock(JSON.stringify(obj[key], null, 2), 'json');

            }
            const label = `${parentKey ? `${parentKey}` : ''}${key}`;
            const completionItem = new vscode.CompletionItem(label, completionItemKind);
            completionItem.detail = detail;
            completionItem.documentation = documentation;
            completionItem.range = new vscode.Range(
              position.translate(0, -match[0].length),
              position,
            );
            completionItem.sortText = sortText
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
          addCompletionItems(currentSettings, match[0], currentKey, isClientFolder);
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
        const meteorSettingsPattern = /Meteor\.settings\.[\w.]+/g;
        const destructuringPattern = /(?:const|let|var)\s*{\s*([^}]+)\s*}\s*=\s*(Meteor\.settings(?:\.\w+)*)/g;
        let match;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const baseDir = workspaceFolders[0].uri.fsPath;
        const settingsFilePath = vscode.workspace.getConfiguration('meteorSettingsIntelliSense').get('settingsFilePath');
        const settingsPath = `${baseDir}/${settingsFilePath}`;

        const wordLocations = {};
        let prevLine = 0;
        let relativePosition;

        const createLink = (key, fullPath) => {
          if (!wordLocations[key]) wordLocations[key] = {};

          const start = match.index + relativePosition;
          const docStart = doc.positionAt(start);

          const end = start + key.length;
          const docEnd = doc.positionAt(end);

          const range = new vscode.Range(docStart, docEnd);

          let line, pos;
          if (!wordLocations[key][relativePosition]) {
            [line, pos] = parseSettings.getSettingPosition(baseDir, settingsFilePath, key, prevLine);
            wordLocations[key][relativePosition] = [line, pos];
          } else[line, pos] = wordLocations[key][relativePosition];

          relativePosition += (key.length + 1)
          prevLine = line;

          let uri = vscode.Uri.file(settingsPath);
          if (line && pos) {
            uri = uri.with({ fragment: `L${line + 1},${pos + 1}` });
          } else if (key !== 'settings') return;

          const link = new vscode.DocumentLink(range, uri);
          links.push(link);
        };

        // Handle direct Meteor.settings references
        while ((match = meteorSettingsPattern.exec(text)) !== null) {
          const keys = match[0].split('.').slice(1); // Remove 'Meteor'
          relativePosition = "Meteor.".length;
          keys.forEach(key => createLink(key, match[0]));
        }

        // Handle destructured assignments
        while ((match = destructuringPattern.exec(text)) !== null) {
          const destructuredVars = match[1].split(',').map(v => v.trim());
          const keyPaths = match[2].split('.').slice(2); // Remove 'Meteor' and 'settings'
          let currentSettings = settings;

          // Traverse the settings object
          for (const key of keyPaths) {
            if (currentSettings && typeof currentSettings === 'object' && key in currentSettings) {
              currentSettings = currentSettings[key];
            } else {
              currentSettings = null;
              break;
            }
          }

          if (currentSettings && typeof currentSettings === 'object') {
            destructuredVars.forEach(variable => {
              const trimmedVar = variable.trim();
              if (trimmedVar in currentSettings) {
                const variableStart = text.indexOf(trimmedVar, match.index);
                if (variableStart !== -1) {
                  const range = new vscode.Range(
                    doc.positionAt(variableStart),
                    doc.positionAt(variableStart + trimmedVar.length)
                  );
                  const fullPath = `${match[2]}.${trimmedVar}`;

                  let [line, pos] = parseSettings.getSettingPosition(baseDir, settingsFilePath, trimmedVar, prevLine);
                  let uri = vscode.Uri.file(settingsPath);

                  if (line && pos) {
                    uri = uri.with({ fragment: `L${line + 1},${pos + 1}` });
                  }

                  const link = new vscode.DocumentLink(range, uri);
                  links.push(link);
                }
              }
            });
          }
        }

        return links;
      },
    });

  context.subscriptions.push(linkProvider);

  // Listen for configuration changes
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('meteorSettingsIntelliSense.settingsFilePath')) {
      console.log('Settings file path changed, reloading settings...');
      settings = loadSettings();
      createSettingsWatcher(context);
    }
  });
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId === 'javascript' || event.document.languageId === 'javascriptreact') {
      updateDiagnostics(event.document, settings);
    }
  });

  vscode.workspace.onDidOpenTextDocument((document) => {
    console.log(`Opened: ${document.uri.fsPath}`);
    if (document.languageId === 'javascript' || document.languageId === 'javascriptreact') {
      console.log('Updating diagnostics for:', document.uri.fsPath);
      updateDiagnostics(document, settings);
    }
  });
  vscode.workspace.onDidCloseTextDocument((doc) => {
    diagnosticsCollection.delete(doc.uri);
  });

  // Update diagnostics for all open documents on activation
  updateAllDiagnostics();

}


function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
