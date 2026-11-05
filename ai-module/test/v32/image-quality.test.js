const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');const {prepare}=require('../../src/v3/quality');
test('reject disguised text/SVG and truncated JPEG with 415', async () => {
  await assert.rejects(prepare(Buffer.from('<svg onload="alert(1)"></svg>')), { status: 415 });
  await assert.rejects(prepare(Buffer.from([255, 216, 255, ...new Array(40).fill(0)])), { status: 415 });
});
test('reject a decompression bomb by dimensions before decoding', async () => {
  const buffer = await sharp({ create: { width: 4100, height: 4000, channels: 3, background: '#aaa' } }).png().toBuffer();
  await assert.rejects(prepare(buffer), { status: 413 });
});
test('dark/white/low-resolution images request retake without inferring cleanliness', async () => {
  for (const [color, reason] of [['black', 'too_dark'], ['white', 'overexposed']]) {
    const buffer = await sharp({ create: { width: 100, height: 100, channels: 3, background: color } }).png().toBuffer();
    const result = await prepare(buffer);
    assert.equal(result.quality.usable, false);
    assert.ok(result.quality.warnings.includes(reason)); assert.ok(result.quality.warnings.includes('low_resolution'));
    assert.equal(result.quality.calibrated, false);
  }
});
test('normalization strips EXIF and enforces RGB/static output', async () => {
  const buffer = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#abc' } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const result = await prepare(buffer), meta = await sharp(result.buffer).metadata();
  assert.equal(meta.orientation, undefined); assert.equal(meta.exif, undefined); assert.equal(meta.width, 200); assert.equal(meta.height, 300);
});
