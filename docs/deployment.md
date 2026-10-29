# Despliegue de alimentos-frontend

Guía para publicar el frontend en Vercel, volver atrás si algo falla y dejar la demo lista. Ningún
valor real aparece aquí: las variables se configuran en el panel de Vercel.

## 1. Variables de Vercel (sin valores)

| Variable              | Entorno                | Obligatoria | Uso                                                                                                            |
| --------------------- | ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Production (y Preview) | Sí          | Origen del backend en Render, sin barra final ni `/api/v1`. Se **incrusta en el bundle**: cambiarla = redeploy |
| `API_URL_INTERNAL`    | Production             | No          | Solo servidor: origen del backend para el ISR de `/impact` si hay una ruta interna                             |

Vercel define solo `VERCEL_GIT_COMMIT_SHA`: el build lo usa como versión de la app y del Service
Worker (`/sw.js?v=<sha>`). No hay secretos en el frontend: todo lo que empieza por `NEXT_PUBLIC_`
lo puede leer cualquiera.

En el backend, `CORS_ORIGINS` debe incluir el dominio exacto del frontend
(`https://<app>.vercel.app`, sin barra final).

## 2. Despliegue

| Ajuste          | Valor                            |
| --------------- | -------------------------------- |
| Framework       | Next.js (detectado)              |
| Install Command | `npm ci`                         |
| Build Command   | `npm run build`                  |
| Node            | 22 (`engines` en `package.json`) |

Orden en el sistema completo: migraciones → `alimentos-ai` → `alimentos-backend` → **frontend**
(ver `docs/deployment.md` del backend). Cada push a `main` crea un deployment de producción; las
ramas crean previews.

Después de desplegar, comprueba:

- `https://<app>.vercel.app/es/system-check`: `crossOriginIsolated = true`, backend `ready`,
  SharedWorker, Service Worker y pool en verde.
- Cabeceras de `/es`: COOP `same-origin`, COEP `require-corp`, `Permissions-Policy`,
  `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`.
- `npm run smoke:prod` del backend con `SMOKE_FRONTEND_ORIGIN` igual al dominio de Vercel (prueba el
  preflight CORS desde este origen).

## 3. Rollback

Vercel guarda cada deployment inmutable: volver atrás es instantáneo y no reconstruye nada.

1. Vercel → proyecto → **Deployments**.
2. Elige el último deployment sano de producción → menú `⋯` → **Promote to Production** (en
   proyectos con _Instant Rollback_, botón **Rollback**).
3. El dominio apunta a ese build en segundos. El Service Worker de los usuarios detecta la versión
   anterior como "nueva" (otra `?v=`) y ofrece **Recargar**.
4. Corrige en una rama, despliega una preview, pruébala y vuelve a promover.

Si el problema era una variable (`NEXT_PUBLIC_API_URL`), corrígela y **redeploy**: las variables
públicas solo cambian al reconstruir.

## 4. ISR de `/impact`

- `/es/impact` y `/en/impact` se generan **en el build** y se regeneran en segundo plano como
  máximo una vez por hora (`export const revalidate = 3600`). Se sirven con
  `Cache-Control: s-maxage=3600, stale-while-revalidate`.
- **Despierta el backend antes de publicar**: si Render está dormido durante el build, la página
  sale con "Datos no disponibles" (el build no falla) y así queda hasta la siguiente regeneración.

  ```bash
  # en alimentos-backend
  SMOKE_BASE_URL=... SMOKE_AI_URL=... SMOKE_FRONTEND_ORIGIN=... npm run smoke:prod -- --warm
  ```

- **Forzar la regeneración**:
  - lo normal: esperar. La primera visita después de la hora dispara la regeneración en segundo
    plano y la visita siguiente ya ve los datos nuevos;
  - de inmediato: Vercel → Deployments → el deployment actual → **Redeploy** (sin la caché de
    build) con el backend despierto. El build vuelve a pedir `GET /public/impact`;
  - no hay ruta de revalidación bajo demanda: evitarla ahorra un secreto más y una superficie de
    ataque para una página que tolera una hora de retraso.
- El backend también cachea `/public/impact` 60 s y el navegador 5 minutos.

## 5. Service Worker: invalidar la caché

- El script se registra como `/sw.js?v=<versión>` y la versión es el commit
  (`VERCEL_GIT_COMMIT_SHA`). Sus cachés se llaman `aiq-static-<v>` y `aiq-pages-<v>`.
- **Cada deploy de un commit nuevo** cambia la versión: el navegador instala el SW nuevo, que
  borra las cachés viejas al activarse, y la app muestra **"Nueva versión disponible · Recargar"**.
  No hay que tocar nada a mano.
- `sw.js` se sirve con `Cache-Control: no-cache`, así el navegador siempre comprueba si cambió.
- **Redeploy del mismo commit** conserva la versión (y las cachés). Si necesitas invalidarlas sin
  cambios de código, crea un commit vacío (`git commit --allow-empty -m "chore: rotate the service
worker caches"`) y despliégalo.
- El SW nunca cachea `/api`, peticiones con `Authorization`, otros orígenes ni el login, así que
  ningún dato privado queda en la caché.
- En una máquina concreta: DevTools → Application → Service Workers → _Unregister_ y _Clear site
  data_.

## 6. Checklist antes de la sustentación

- [ ] El día anterior: `npm run seed:refresh-demo -- --confirm-host=<host>` en el backend (fechas al
      día) y `npm run smoke:prod` del backend en PASS (WARN solo por IA degradada o cuota).
- [ ] 15 minutos antes: `npm run smoke:prod -- --warm` (backend, IA y frontend despiertos).
- [ ] `/es/impact` muestra cifras, no "Datos no disponibles" (si no: Redeploy con el backend
      despierto, §4).
- [ ] `/es/system-check`: `crossOriginIsolated = true`, backend listo, SharedWorker/SW/pool en verde.
- [ ] Login de ADMIN y de OPERATOR (las credenciales demo, fuera de las diapositivas).
- [ ] Una propuesta `AI_ASSISTED` sin `degraded` (si sale degradada, mostrar la degradación como
      parte de la demo: la app sigue funcionando).
- [ ] Laboratorio con 10.000 y 20.000 pedidos en los tres modos, y Cancelar a mitad.
- [ ] Dos pestañas abiertas: el badge de alertas igual en ambas con un solo sondeo (DevTools →
      Network → filtro `alerts`).
- [ ] Modo avión: una navegación muestra la página offline traducida.
- [ ] Probar en el teléfono (360–390 px) y en el portátil; tema claro y oscuro; `es` y `en`.
- [ ] Tener a mano el deployment anterior por si hay que promoverlo (§3).
