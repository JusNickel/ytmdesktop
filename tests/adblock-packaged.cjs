const { app, session } = require('electron');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
fs.mkdirSync(path.resolve('.verification'), { recursive: true });
const result = path.resolve('.verification/packaged-runtime-result.json');
app.whenReady().then(async () => {
 const archive = path.resolve(process.argv[2] || 'out/YouTube Music Desktop App-win32-x64/resources/app.asar');
 const packagedRequire = createRequire(path.join(archive, '.vite/main/index.cjs'));
 const { ElectronBlocker } = packagedRequire('@ghostery/adblocker-electron');
 const blocker = ElectronBlocker.parse('||doubleclick.net^');
 const isolated = session.fromPartition('packaged-runtime-test');
 blocker.enableBlockingInSession(isolated);
 assert.equal(blocker.isBlockingEnabled(isolated), true);
 await assert.rejects(isolated.fetch('https://googleads.g.doubleclick.net/pagead/test'), /ERR_BLOCKED_BY_CLIENT/);
 const dependencyRequire = createRequire(packagedRequire.resolve('@ghostery/adblocker-electron'));
 const preload = dependencyRequire.resolve('@ghostery/adblocker-electron-preload');
 assert(fs.existsSync(preload));
 assert(preload.includes('app.asar'));
 blocker.disableBlockingInSession(isolated);
 const cosmetic = ElectronBlocker.parse('||doubleclick.net^');
 cosmetic.getCosmeticsFilters = () => ({active:true,styles:'body{}',scripts:['broken()','working()']});
 const errors = []; const scripts = []; const originalError = console.error; const originalWarn = console.warn;
 console.error = (...args) => errors.push(args); console.warn = (...args) => errors.push(args);
 try {
   await cosmetic.onInjectCosmeticFilters({sender:{
     insertCSS: () => Promise.reject(new Error('fixture CSS failure')),
     executeJavaScript: script => { scripts.push(script); return script === 'broken()' ? Promise.reject(new Error('fixture script failure')) : Promise.resolve(); }
   },frameId:1,processId:1},'https://music.youtube.com/');
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(errors.length,2);
   assert.deepEqual(scripts,['broken()','working()']);
 } finally { console.error=originalError; console.warn=originalWarn; }

 fs.writeFileSync(result, JSON.stringify({passed: true, entry: packagedRequire.resolve('@ghostery/adblocker-electron'), preload}));
}).then(() => app.exit(0), error => {fs.writeFileSync(result, JSON.stringify({passed:false,error:String(error),stack:error.stack}));app.exit(1)});
