# Demo comercial profesional de Criteriva

## Resultado esperado
- La app abre completa desde cualquier navegador, sin depender de servicios externos ni registros previos.
- Dashboard, vehículos, subastas, CRM, actividad, grupos, galerías y detalles comparten el mismo dataset ficticio y coherente.
- Todas las rutas son operables desde 320, 375, 390 y 430 px sin desbordes, cortes ni controles difíciles de tocar.
- La versión desktop conserva su estructura e identidad actual.

## Implementación

### 1. Fuente local de datos demo
- Crear un único dataset local, determinístico y tipado con 12 vehículos, imágenes locales existentes, patentes y vendedores ficticios.
- Relacionar subastas programadas, activas, cerradas/adjudicadas y canceladas con leads, ofertas, publicaciones, notas, vistas y actividad.
- Calcular contadores, mejores ofertas, reserva alcanzada/no alcanzada/pendiente y KPIs desde esas relaciones para evitar discrepancias.
- Usar exclusivamente los datos locales en la experiencia demo pública, eliminando estados vacíos provocados por red o permisos.
- Mantener importes en ARS y nombres anonimizados tipo “Lead Demo 01”, sin teléfonos, correos ni identificadores personales reales.

### 2. Integración en todas las rutas
- Conectar dashboard, listados, detalles, CRM, pipeline, actividad, grupos, galería y mini app de oferta al mismo origen local.
- Mantener navegación, filtros, tabs, galerías y simulaciones interactivas; las acciones demo actualizarán el estado local de la sesión cuando corresponda, sin llamadas externas.
- Agregar estados claros para identificadores inexistentes en vez de pantallas de carga permanentes.
- Mostrar en todas las experiencias la etiqueta exacta “DEMO · DATOS FICTICIOS”.

### 3. Correcciones mobile-first
- Eliminar anchos fijos problemáticos en filtros y adaptar formularios y acciones a ancho completo en pantallas pequeñas.
- Convertir el pipeline móvil en secciones verticales legibles, manteniendo el tablero horizontal en desktop.
- Asegurar targets táctiles mínimos de 44 px en navegación, ajustes, galería, chat y diálogos.
- Dar margen lateral y desplazamiento interno a diálogos; reorganizar KPIs y acciones de detalle sin alterar desktop.
- Añadir protección global contra desborde horizontal y cortes de textos largos.

### 4. Privacidad y seguridad
- Como la demo dejará de leer información comercial desde la base, retirar el acceso anónimo a `activity_log`, `bids` y `lead_notes` sin afectar la presentación pública.
- Mantener los datos reales y secretos fuera del frontend; las imágenes demo serán archivos locales del proyecto.

### 5. Verificación
- Probar todas las rutas a 320, 375, 390 y 430 px, además de desktop.
- Validar ausencia de overflow global, elementos superpuestos, rutas rotas y errores de consola.
- Ejecutar pruebas disponibles y verificar el build de producción.
- Revisar consistencia automática entre ofertas, contadores, mejores ofertas, reservas, estados, KPIs y actividad.
- No publicar. La integración GitHub existente se conserva; el entorno sincroniza los cambios del proyecto en la rama configurada.
