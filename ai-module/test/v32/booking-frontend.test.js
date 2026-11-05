const {test}=require('node:test');const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
test('all inline booking/demo JavaScript parses; V3 no longer calls legacy price estimate', () => {
  const root = path.join(__dirname, '../../..');
  const html = fs.readFileSync(path.join(root, 'frontend/booking.html'), 'utf8');
  let count = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
    new vm.Script(match[2]); count++;
  }
  assert.ok(count > 0); assert.ok(html.includes('ai.analyzeV32(formData)'));
  assert.ok(!html.includes('ai.estimate(formData)')); assert.ok(!html.includes('progressTimer'));
  new vm.Script(fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8'));
  new vm.Script(fs.readFileSync(path.join(root, 'ai-module/public/v3-demo.js'), 'utf8'));
});
