const EXPIRATION_HOURS = 2;

const calculateExpiration = () => {
  return new Date(Date.now() + EXPIRATION_HOURS * 60 * 60 * 1000);
};

const isExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

module.exports = {
  EXPIRATION_HOURS,
  calculateExpiration,
  isExpired,
};