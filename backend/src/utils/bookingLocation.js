// Optional coordinates; never coerce strings, booleans or partial pairs.
function validateBookingLocation(body) {
  const { latitude, longitude, location_accuracy } = body;
  const absent = value => value === undefined || value === null;
  if (absent(latitude) && absent(longitude) && absent(location_accuracy)) {
    return { latitude: null, longitude: null, location_accuracy: null };
  }
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
      (!absent(location_accuracy) && (typeof location_accuracy !== 'number' ||
        !Number.isFinite(location_accuracy) || location_accuracy < 0 || location_accuracy > 10000000))) {
    const error = new Error('Tọa độ GPS hoặc độ chính xác không hợp lệ. Vui lòng chọn lại vị trí.');
    error.statusCode = 400;
    throw error;
  }
  return { latitude, longitude, location_accuracy: location_accuracy ?? null };
}
module.exports = { validateBookingLocation };
