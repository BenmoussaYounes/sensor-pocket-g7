/**
 * Secret de signature des JWT. Pas de valeur par défaut : un secret "de
 * secours" écrit dans le code serait connu de tous ceux qui lisent le dépôt
 * et permettrait de forger un jeton valide. Le backend refuse de démarrer
 * sans JWT_SECRET (>= 32 caractères).
 *   générer : node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET manquant ou trop court (32 caractères minimum). Définissez-le dans .env / les variables d’environnement.',
    );
  }
  return secret;
}

export const JWT_ALGORITHM = 'HS256' as const;
