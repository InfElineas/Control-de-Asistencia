# Guía: publicar una nueva versión de la app móvil desde la web

Esta guía cubre los pasos para que los cambios de la función "descargar la app desde la web"
(`/descargar-app`, tabla `app_releases`, bucket `app-releases`) queden funcionando en Supabase, en la web y para publicar cada nueva APK.

## 1) Supabase (una sola vez)

Ya aplicado en este proyecto — no requiere acción, solo referencia:

- Migración `supabase/migrations/20260720150000_add_app_releases.sql` ya está pusheada a la base remota (`bogguolwffhdlusudgoh`).
- Crea la tabla `app_releases` (lectura pública, escritura solo `superadmin`) y el bucket público `app-releases`.

Si en el futuro clonas este proyecto en otro entorno Supabase, aplica la migración con:

```bash
npx supabase db push --linked
```

## 2) Web (código)

1. Commitea los cambios de este feature (páginas nuevas, hook, componente, ruta, migración, `types.ts` regenerado).
2. Haz push a `main` en GitHub. Como el proyecto está conectado a Lovable, el push se sincroniza automáticamente al proyecto Lovable.
3. Entra a [Lovable](https://lovable.dev) → tu proyecto → **Share → Publish** para que el dominio público sirva la nueva versión del sitio (Lovable no publica solo con el push, hay que darle "Publish" explícitamente).
4. Verifica en el dominio real:
   - `/descargar-app` carga y muestra "Todavía no hay una versión publicada" (hasta que subas la primera APK).
   - En `/auth` aparece el enlace "¿Usas Android? Descarga la app aquí".

## 3) Publicar la APK (cada vez que saques una versión nueva)

Hoy este proceso es manual (no hay CI/CD para compilar/firmar la APK — ver `docs/analisis-repositorio-2026-07-20.md`):

1. Compila la APK como ya lo haces hoy:
   ```bash
   npm run mobile:build
   npm run mobile:sync
   npm run mobile:android   # abre Android Studio
   ```
   En Android Studio: **Build → Build APK(s)** (o **Generate Signed Bundle/APK** si ya tienes keystore de release).
2. Ubica el `.apk` generado (normalmente en `android/app/build/outputs/apk/...`).
3. Entra a la web con tu cuenta **superadmin** → **Panel administrativo técnico** (`/superadmin`) → tarjeta **"App móvil (Android)"**.
4. Sube el archivo `.apk`, escribe:
   - **Versión** (ej. `1.4.0`) — texto libre, es lo que ve el usuario final.
   - **Version code** (ej. `14`) — número entero; usa uno mayor que el anterior para que la lista quede ordenada de más reciente a más antigua.
   - **Notas de la versión** (opcional) — qué cambió.
5. Click **Publicar versión**. La página pública `/descargar-app` mostrará automáticamente esta nueva versión (se calcula por el `version code` más alto).

No es necesario borrar versiones anteriores, pero puedes eliminarlas desde la misma tarjeta si quieres limpiar el historial.

## Notas

- El bucket `app-releases` es público: cualquiera con el link directo del archivo puede descargarlo, aunque solo se llega a él desde `/descargar-app`.
- Solo usuarios con rol `superadmin` pueden subir o eliminar versiones (verificado por RLS en la base de datos, no solo en la UI).
