// Tests run in a European time zone with daylight saving time so that day keys,
// streaks and DST transitions are exercised the way Belgian users experience them.
module.exports = async () => {
  process.env.TZ = 'Europe/Brussels';
};
