#!/usr/bin/env node

/**
 * patch-ios.mjs
 * Idempotent merge-based patching for HealthKit entitlements and usage descriptions.
 * Run after `npx cap sync ios`.
 *
 * RULES:
 * - Never overwrites existing keys — only adds missing ones.
 * - Never inserts health-records (we don't use clinical data).
 * - Preserves background-delivery if already present.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const IOS_DIR = join(process.cwd(), 'ios', 'App', 'App');
const PBXPROJ = join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

// ── 1. Patch Info.plist (merge, don't overwrite) ───────────────────
function patchInfoPlist() {
  const plistPath = join(IOS_DIR, 'Info.plist');
  if (!existsSync(plistPath)) {
    console.error('❌ Info.plist not found at', plistPath);
    process.exit(1);
  }

  let plist = readFileSync(plistPath, 'utf8');
  let changed = false;

  const healthDescriptions = `
	<key>NSHealthShareUsageDescription</key>
	<string>VYR Labs reads your heart rate, resting heart rate, heart rate variability (HRV), sleep analysis, step count, blood oxygen saturation (SpO2), and respiratory rate to calculate your daily cognitive performance score and provide personalized insights.</string>
	<key>NSHealthUpdateUsageDescription</key>
	<string>VYR Labs writes summary records for steps, body temperature, sleep, heart rate, HRV, blood pressure, VO2Max, SpO2, and active energy burned to Apple Health when permitted.</string>`;

  if (!plist.includes('NSHealthShareUsageDescription')) {
    plist = plist.replace(/<\/dict>\s*<\/plist>/, `${healthDescriptions}\n</dict>\n</plist>`);
    writeFileSync(plistPath, plist);
    console.log('✅ Info.plist patched with HealthKit usage descriptions');
  } else {
    console.log('ℹ️  NSHealthShareUsageDescription already present');
  }

  // NSHealthUpdateUsageDescription
  if (!plist.includes('NSHealthUpdateUsageDescription')) {
    const desc = `\t<key>NSHealthUpdateUsageDescription</key>
\t<string>VYR Labs writes steps, heart rate, HRV, sleep, SpO2, body temperature, blood pressure, VO2 max, and active energy back to Apple Health so you can view cognitive wellness trends alongside your health data. No raw data is modified. Disable anytime in Settings › Privacy › Health.</string>`;
    plist = plist.replace(/<\/dict>\s*<\/plist>/, `${desc}\n</dict>\n</plist>`);
    changed = true;
    console.log('✅ Added NSHealthUpdateUsageDescription');
  } else {
    console.log('ℹ️  NSHealthUpdateUsageDescription already present');
  }

  if (changed) writeFileSync(plistPath, plist);
}

function ensureEntitlementKey(xml, key, valueXml) {
  if (xml.includes(`<key>${key}</key>`)) {
    const pattern = new RegExp(`<key>${key}<\\/key>\\s*(<true\\/>|<false\\/>|<array>[\\s\\S]*?<\\/array>)`, 'm');
    return xml.replace(pattern, `<key>${key}</key>\n\t${valueXml}`);
  }

  return xml.replace('</dict>', `\t<key>${key}</key>\n\t${valueXml}\n</dict>`);
}

// 2. Create/patch App.entitlements
function patchEntitlements() {
  const entPath = join(IOS_DIR, 'App.entitlements');
  const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>`;
  } else {
    // Merge missing keys before </dict>
    let insertions = '';
    if (needsHealthkit) {
      insertions += '\t<key>com.apple.developer.healthkit</key>\n\t<true/>\n';
    }
    if (needsBgDelivery) {
      insertions += '\t<key>com.apple.developer.healthkit.background-delivery</key>\n\t<true/>\n';
    }
    if (insertions) {
      existing = existing.replace(/<\/dict>/, `${insertions}</dict>`);
    }
  }

  let xml = existsSync(entPath) ? readFileSync(entPath, 'utf8') : defaultXml;

  xml = ensureEntitlementKey(xml, 'com.apple.developer.healthkit', '<true/>');
  xml = ensureEntitlementKey(xml, 'com.apple.developer.healthkit.background-delivery', '<true/>');

  xml = xml.replace(/\s*<key>com\.apple\.developer\.healthkit\.access<\/key>\s*<array>[\s\S]*?<\/array>/g, '');
  xml = xml.replace(/\s*<string>health-records<\/string>\s*/g, '');

  writeFileSync(entPath, xml);
  console.log('✅ App.entitlements merged (idempotent), no health-records added');
}

// ── 3. Patch project.pbxproj ───────────────────────────────────────
function patchPbxproj() {
  if (!existsSync(PBXPROJ)) {
    console.error('❌ project.pbxproj not found at', PBXPROJ);
    return;
  }

  let pbx = readFileSync(PBXPROJ, 'utf8');
  let changed = false;

  if (!pbx.includes('com.apple.HealthKit')) {
    if (pbx.includes('SystemCapabilities = {')) {
      pbx = pbx.replace(
        /SystemCapabilities = \{/,
        `SystemCapabilities = {\n\t\t\t\tcom.apple.HealthKit = {\n\t\t\t\t\tenabled = 1;\n\t\t\t\t};`,
      );
      writeFileSync(PBXPROJ, pbx);
      console.log('✅ project.pbxproj patched with HealthKit capability');
    }
  } else {
    console.log('ℹ️  project.pbxproj already has HealthKit capability');
  }

  if (!pbx.includes('CODE_SIGN_ENTITLEMENTS = "App/App.entitlements"')) {
    pbx = readFileSync(PBXPROJ, 'utf8');
    pbx = pbx.replace(/CODE_SIGN_ENTITLEMENTS = ""/g, 'CODE_SIGN_ENTITLEMENTS = "App/App.entitlements"');
    writeFileSync(PBXPROJ, pbx);
    console.log('✅ project.pbxproj patched');
  } else {
    console.log('ℹ️  project.pbxproj already correct');
  }
}

console.log('🔧 Patching iOS project for HealthKit...\n');
patchInfoPlist();
patchEntitlements();
patchPbxproj();
console.log('\n🎉 iOS patch complete!');
