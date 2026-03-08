const pl = require('./package-lock.json');
const pkgs = pl.packages || {};
const keys = Object.keys(pkgs);

console.log('=== expo-modules-core ===');
keys.filter(k => k.includes('expo-modules-core')).forEach(k => console.log(k, '->', pkgs[k].version));

console.log('\n=== @expo/config-plugins ===');
keys.filter(k => k.includes('config-plugins')).forEach(k => console.log(k, '->', pkgs[k].version));

console.log('\n=== expo-notification ===');
keys.filter(k => k.includes('expo-notif')).forEach(k => console.log(k, '->', pkgs[k].version));

console.log('\n=== notifee ===');
keys.filter(k => k.includes('notifee')).forEach(k => console.log(k, '->', pkgs[k].version));

console.log('\n=== react-native-google-mobile-ads deps ===');
const adsKey = keys.find(k => k.endsWith('react-native-google-mobile-ads'));
if (adsKey && pkgs[adsKey].dependencies) {
  console.log(JSON.stringify(pkgs[adsKey].dependencies, null, 2));
} else {
  console.log('no explicit deps or not found');
}

console.log('\n=== @react-native-firebase deps ===');
keys.filter(k => k.includes('@react-native-firebase')).forEach(k => {
  console.log(k, '->', pkgs[k].version);
  if (pkgs[k].dependencies) console.log('  deps:', JSON.stringify(pkgs[k].dependencies));
});
