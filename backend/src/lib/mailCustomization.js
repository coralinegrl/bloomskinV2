const fs = require('node:fs');
const path = require('node:path');
const { dataDir, atomicJson } = require('./adminFiles');
const file = path.join(dataDir,'mail-customization.json');
const states = ['pending_payment','payment_submitted','paid','shipped','pickup_ready','delivered','cancelled'];
function readCustomization() {
  const input = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) : {};
  return Object.fromEntries(states.map(state => [state,{ enabled:input[state]?.enabled !== false, note:String(input[state]?.note || '').trim().slice(0,800) }]));
}
function writeCustomization(input) {
  const config = Object.fromEntries(states.map(state => [state,{ enabled:input[state]?.enabled !== false, note:String(input[state]?.note || '').trim().slice(0,800) }]));
  atomicJson(file,config); return config;
}
function customizeMessage(content,state) {
  if (!content) return null;
  const config = readCustomization()[state];
  if (!config?.enabled) return null;
  return config.note ? { ...content, paragraphs:[...content.paragraphs,config.note] } : content;
}
module.exports = { states, readCustomization, writeCustomization, customizeMessage };
