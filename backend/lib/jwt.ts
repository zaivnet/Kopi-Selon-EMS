export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '' || secret === 'secret') {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing or insecure in production environment!');
    }
    return 'kopi-selon-jwt-secret-key-dev-mode-change-in-production-987654321';
  }
  return secret;
};
