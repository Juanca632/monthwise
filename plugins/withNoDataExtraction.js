// Android 12+ ignores allowBackup=false for phone-to-phone transfer, so FR-027 also needs
// data extraction rules that exclude every domain (research R11).
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];
const RULES_NAME = 'data_extraction_rules';

function buildRulesXml() {
  const excludes = DOMAINS.map((domain) => `    <exclude domain="${domain}" path="." />`).join('\n');
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<data-extraction-rules>',
    '  <cloud-backup>',
    excludes,
    '  </cloud-backup>',
    '  <device-transfer>',
    excludes,
    '  </device-transfer>',
    '</data-extraction-rules>',
    '',
  ].join('\n');
}

function applyToManifest(manifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  application.$['android:dataExtractionRules'] = `@xml/${RULES_NAME}`;
  return manifest;
}

function withNoDataExtraction(config) {
  config = withAndroidManifest(config, (cfg) => {
    applyToManifest(cfg.modResults);
    return cfg;
  });
  // There is no typed mod for res/xml files, so the file is written directly.
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, `${RULES_NAME}.xml`), buildRulesXml());
      return cfg;
    },
  ]);
}

module.exports = withNoDataExtraction;
module.exports.buildRulesXml = buildRulesXml;
module.exports.applyToManifest = applyToManifest;
