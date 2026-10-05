import type { AndroidConfig } from 'expo/config-plugins';

const { applyToManifest, buildRulesXml } = require('../../plugins/withNoDataExtraction') as {
  applyToManifest: (m: AndroidConfig.Manifest.AndroidManifest) => AndroidConfig.Manifest.AndroidManifest;
  buildRulesXml: () => string;
};

const DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];

function section(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) throw new Error(`missing <${tag}>`);
  return match[1];
}

describe('withNoDataExtraction', () => {
  it('points the application to the rules file', () => {
    const manifest = {
      manifest: {
        $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
        application: [{ $: { 'android:name': '.MainApplication' } }],
      },
    } as AndroidConfig.Manifest.AndroidManifest;

    const result = applyToManifest(manifest);

    expect(result.manifest.application?.[0].$['android:dataExtractionRules']).toBe(
      '@xml/data_extraction_rules',
    );
  });

  it.each(['cloud-backup', 'device-transfer'])('excludes every domain from %s', (tag) => {
    const body = section(buildRulesXml(), tag);
    for (const domain of DOMAINS) {
      expect(body).toContain(`<exclude domain="${domain}" path="." />`);
    }
    expect(body).not.toContain('<include');
  });
});
