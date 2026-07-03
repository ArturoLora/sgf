# Deferred Work

## Deferred from: code review of story-3.1 (2026-07-02)

- AC8 no se cumple literalmente: no existe `modules/users/users.service.ts`, solo `types.ts` — deviación documentada por el dev (diferido a Story 3.2, evita crear un archivo sin caso de uso real). Aceptada.
- `User.banned`/`banExpires` se agregaron (obligatorios por el plugin, H1) pero `requireAuth()` nunca los verifica — si en el futuro se invoca `banUser()` (hoy nunca, por AD-U2), una sesión activa no sería bloqueada hasta expirar por sí sola. Dormant mientras no se use `banUser()`.
