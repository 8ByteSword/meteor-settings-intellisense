const fs = require('fs');
const path = require('path');

/**
 * Reads and parses the settings.json file.
 * @param {string} baseDir - The base directory where settings.json is located.
 * @param {string} settingsFilePath - The custom path to the settings file.
 * @returns {Object} - The parsed settings object.
 */
function readSettings(baseDir, settingsFilePath) {
  const filePath = path.isAbsolute(settingsFilePath)
    ? settingsFilePath
    : path.join(baseDir, settingsFilePath);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const settings = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(settings);
}

module.exports = {
  readSettings,
};
