# Guía: compilar la APK en Android Studio

Pasos para generar el `.apk` desde Android Studio, listo para instalar o subir a `/superadmin`
(ver `docs/guia-publicar-app-movil.md`). Requiere que `android/` ya esté sincronizado
(`npm run mobile:build && npm run mobile:sync`).

## 1) Abrir el proyecto

```bash
npm run mobile:android
```

Esto abre `android/` en Android Studio. La primera vez, espera a que termine el **Gradle Sync**
(barra de progreso abajo) — puede tardar varios minutos mientras descarga dependencias.

Si Android Studio pide **"Upgrade Gradle Plugin"** o similar, acepta (o usa la versión que ya trae
el proyecto si prefieres no actualizar).

## 2) Verifica la versión antes de compilar

Abre `android/app/build.gradle` y confirma `versionCode` / `versionName` (súbelos en cada release
nueva, ver `docs/guia-publicar-app-movil.md` paso 3). Puedes editarlo directamente en Android Studio
o en tu editor antes de abrir el proyecto.

## 3A) APK debug (rápida, para pruebas)

No requiere firma propia (usa un keystore de debug automático).

1. Menú **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
2. Espera a que compile — al terminar aparece una notificación abajo a la derecha:
   **"APK(s) generated successfully"** con un link **locate**.
3. El archivo queda en:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

Sirve para probar en tu teléfono (`adb install -r app-debug.apk`), pero **no la publiques** como
release: Android marcará futuras actualizaciones como de otra "app" si luego cambias a una APK
firmada con otra key (ver `docs/apk-instalacion-problemas.md` punto 2).

## 3B) APK/AAB release (firmada, para publicar de verdad)

### Primera vez: crear el keystore

1. Menú **Build → Generate Signed Bundle / APK**.
2. Elige **APK** (o **Android App Bundle** si vas a subir a Play Store; para descarga directa desde
   `/descargar-app` usa **APK**).
3. En "Key store path" click **Create new...**:
   - **Key store path**: guárdalo fuera del repo (ej. `C:\keystores\asistencia-release.jks`) —
     **nunca lo commitees a git**.
   - **Password**: elige una y **guárdala en un gestor de contraseñas**. Si la pierdes, no podrás
     volver a firmar actualizaciones con la misma key y los usuarios no podrán actualizar sin
     desinstalar la app primero.
   - **Alias**, **alias password**, **validity** (25 años+ recomendado), y datos del certificado
     (nombre, organización — pueden ser genéricos).
4. Click **OK**, luego **Next**.

### Siguientes veces: reusar el keystore existente

En el mismo diálogo, "Key store path" → selecciona el `.jks` ya creado e ingresa las contraseñas
guardadas. **Usa siempre el mismo keystore** para todas las versiones futuras de esta app.

### Generar la APK

1. Selecciona **release** como Build Variant.
2. Marca las firmas **V1 (Jar Signature)** y **V2 (Full APK Signature)**.
3. Click **Finish**. Al terminar, notificación **"APK(s) generated successfully"**.
4. El archivo queda en:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

## 4) Prueba antes de subirla

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb logcat | grep -i -E "PackageManager|INSTALL_FAILED|FATAL EXCEPTION"
```

Confirma que abre, pide permisos de ubicación, y el check-in/check-out funciona.

## 5) Publícala

Sube el `.apk` desde `/superadmin` → tarjeta **"App móvil (Android)"**
(ver `docs/guia-publicar-app-movil.md` paso 3).

## Problemas comunes

Ver `docs/checklist-hardening-apk.md` (antes de publicar) y `docs/apk-instalacion-problemas.md`
(si la APK no instala o no abre).
