# ADR-005: Autenticación Basada en Sesión con Cookies HttpOnly y Argon2id

## Estado
Aceptado

## Contexto
Se evaluó el método de autenticación para la SPA de CodeLab servida bajo el mismo origen a través del reverse proxy Caddy (`/` para frontend, `/api/` para backend).
Almacenar JSON Web Tokens (JWT) en `localStorage` introduce vulnerabilidades severas frente a Cross-Site Scripting (XSS), ya que cualquier script malicioso puede sustraer el token permanentemente. Además, la revocación inmediata de JWTs requiere listas de revocación en Redis, incrementando la complejidad innecesariamente.

## Decisión
1. **Almacenamiento de contraseñas:** Utilizar `Argon2id` con parámetros seguros recomendados por OWASP.
2. **Sesiones Seguras:**
   - Autenticación por sesión basada en cookies `HttpOnly`, `SameSite=Lax` (o `Strict`), y `Secure` en entornos HTTPS.
   - La cookie de sesión (`JSESSIONID`) no es accesible mediante JavaScript del navegador.
   - Protección contra CSRF mediante token `X-XSRF-TOKEN`.
3. **Roles iniciales:** `ROLE_STUDENT`, `ROLE_TEACHER`, `ROLE_ADMIN`.
4. **Autorización contextual a nivel de servicio:** La pertenencia a cursos, grupos y actividades se valida server-side en cada endpoint para prevenir Insecure Direct Object Reference (IDOR).

## Consecuencias
- **Positivas:**
  - Máxima protección contra robo de credenciales mediante XSS.
  - Revocación y caducidad de sesiones inmediata en servidor.
  - Cero necesidad de Redis para blacklist de tokens.
- **Negativas:**
  - Requiere manejo de cookies y protección CSRF en las llamadas AJAX del frontend.

