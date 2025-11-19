export const isValidPassword = (password) => {
  if (password.length < 8 || password.length > 16) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasSpecial;
};
