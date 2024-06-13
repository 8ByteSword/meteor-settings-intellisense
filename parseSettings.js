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

/**
 * Reads and parses the settings.json file.
 * @param {string} baseDir - The base directory where settings.json is located.
 * @param {string} settingsFilePath - The custom path to the settings file.
 * @param {string} setting - The setting to look for.
 * @returns {Array} - The line and the position in the line respectively.
 */
function getSettingPosition(baseDir, settingsFilePath, setting, startingLine = 0) {
  let res = [];
  const filePath = path.isAbsolute(settingsFilePath)
  ? settingsFilePath
  : path.join(baseDir, settingsFilePath);
  if (!fs.existsSync(filePath)) {
    return res;
  }
  const settings = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  settings.slice(startingLine).some((line, index) => {
    const pos = line.indexOf(`"${setting}"`);
    if(pos && pos >= 0) { res = [index + startingLine, pos]; return true; }
    return false;
  });
  return res;
}

module.exports = {
  readSettings,
  getSettingPosition,
};
