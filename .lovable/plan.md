## Qué voy a corregir

Identifiqué dos problemas reales y una inconsistencia funcional:

1. **El dashboard no coincide con lo pedido**
   - Hoy muestra: **Activas, Cerradas, Ofertas, Galería, Leads**.
   - Pero lo que se quería verificar era: **Subastas activas, subastas cerradas, vehículos publicados, ofertas totales, leads pendientes y actividad reciente**.
   - O sea: el KPI de **Vehículos publicados** directamente **no existe** en el código actual; está reemplazado por **Galería**.

2. **Las consultas del dashboard silencian errores y terminan mostrando 0 / vacío**
   - En `src/pages/Dashboard.tsx` las queries hacen `return data || []` o `return count || 0` sin lanzar error si falla la consulta.
   - Si hay un problema de permisos, la UI puede quedar en **ceros** aunque la base tenga datos.

3. **Hay una alta probabilidad de que los permisos admin se hayan roto con la migración de seguridad**
   - Las políticas RLS usan `public.is_admin(auth.uid())` para `auctions`, `vehicles`, `bids`, `leads`, `activity_log`, etc.
   - Pero existe una migración que hace:
     - `REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;`
     - `GRANT EXECUTE ... TO service_role;`
   - Eso puede impedir que el rol autenticado evalúe la función dentro de las políticas, dejando al dashboard sin acceso aunque el usuario sí sea admin.

## Plan de implementación

### 1) Restaurar el acceso correcto para las políticas admin
- Revisar y corregir la estrategia de permisos de `is_admin(...)` para que las políticas RLS puedan evaluarse correctamente para usuarios autenticados admin.
- Aplicar el ajuste también pensando en Storage, porque las políticas del bucket `vehicle-images` también dependen de esa función.
- Validar que las tablas del panel admin vuelvan a responder con datos reales para cuentas admin.

### 2) Hacer explícito el estado “auth/admin listo” antes de consultar el dashboard
- Crear una capa de “sesión lista / admin listo” en autenticación.
- Evitar que el dashboard dispare queries antes de que el usuario esté correctamente resuelto.
- Agregar `enabled` en las queries dependientes de sesión/admin para evitar estados intermedios engañosos.
- Si el usuario no es admin, mostrar un estado claro de acceso restringido en vez de ceros.

### 3) Dejar de ocultar errores de datos
- Cambiar las queries del dashboard para que, si una consulta falla, el error se propague y se vea en pantalla o en un estado controlado.
- Reemplazar el patrón actual de fallback silencioso por:
  - loading real,
  - error visible,
  - datos válidos cuando la consulta efectivamente responde.
- Esto evita volver a caer en un dashboard “vacío pero sin explicación”.

### 4) Alinear el dashboard con los KPIs correctos
- Reemplazar el KPI **Galería** por **Vehículos publicados**.
- Mantener y validar estos valores:
  - **Activas**
  - **Cerradas**
  - **Vehículos publicados**
  - **Ofertas totales**
  - **Leads pendientes**
  - **Actividad reciente**
- Dejar la actividad reciente como listado de las últimas entradas reales de `activity_log`.

### 5) Verificación funcional completa después del fix
Una vez aplicado, voy a comprobar que el dashboard muestre exactamente:

- **Activas:** 7
- **Cerradas:** 2
- **Vehículos publicados:** 6
- **Ofertas totales:** 69
- **Leads pendientes:** 3
- **Actividad reciente:** últimas 10 entradas de `activity_log`

Además verificaré que:
- refrescar la página no vuelva a dejar el panel en cero,
- el usuario admin siga entrando correctamente,
- un usuario no admin no vea datos sensibles,
- las imágenes del bucket sigan protegidas con escritura solo admin.

## Archivos que tocaría
- `src/pages/Dashboard.tsx`
- `src/contexts/AuthContext.tsx`
- `src/App.tsx` o un hook nuevo de readiness/admin
- nueva migración SQL para corregir permisos/uso de `is_admin(...)`

## Resultado esperado
Después del cambio, el dashboard va a dejar de “mentir con ceros”, va a mostrar los KPIs correctos pedidos, y los permisos admin van a quedar consistentes con la seguridad nueva.

Si aprobás, lo implemento.