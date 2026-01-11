# AdminPanel - Documentación Técnica y Manual de Usuario

## 1. Descripción General
AdminPanel es un panel de administración moderno diseñado para la gestión de servidores Raspberry Pi y otros dispositivos. Está construido completamente con tecnologías web modernas (HTML5, CSS3, JavaScript ES6+) y utiliza IndexedDB para el almacenamiento persistente local.

## 2. Tecnologías Utilizadas
- **Frontend**: Bootstrap 5 (Layout y UI), FontAwesome (Iconos).
- **Base de Datos**: Dexie.js (Wrapper de IndexedDB para almacenamiento local persistente).
- **Terminal**: Xterm.js (Simulación de terminal SSH).
- **Autenticación**: Sistema basado en sesiones (sessionStorage) con recuperación mediante preguntas de seguridad.

## 3. Instalación y Ejecución
Para que la terminal SSH sea funcional y se conecte realmente a tus equipos, necesitas ejecutar el servidor de Node.js:

1. Asegúrate de tener instalado **Node.js**.
2. Abre una terminal en la carpeta del proyecto.
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor:
   ```bash
   npm start
   ```
5. Accede al panel desde tu navegador en: `http://localhost:3000`

*Nota: La terminal SSH real requiere que el servidor Node.js esté en ejecución para actuar como puente (proxy) entre el navegador y tus dispositivos.*

## 4. Manual de Usuario
### Acceso Inicial
- **Usuario por defecto**: `admin`
- **Contraseña por defecto**: `admin123`
- **Pregunta de seguridad**: ¿Cuál es tu color favorito? -> **Respuesta**: `azul`

### Funcionalidades
1. **Dashboard**: Resumen estadístico de servidores, dispositivos de red, usuarios y actividad reciente.
2. **Gestión de Infraestructura**:
   - Inventario organizado de **Servidores, Switches, Routers y NAS**.
   - Clasificación por tipos con indicadores visuales de estado.
   - Acceso directo vía Terminal SSH (Simulada) para gestión remota.
   - Control de IPs, puertos y credenciales de acceso.
3. **Gestión de Usuarios**: Control de acceso con roles y medidas de recuperación.
4. **Logs**: Registro detallado de todas las acciones realizadas en el sistema.
5. **Backup**: En la sección de Configuración, puede exportar un archivo JSON con toda la base de datos actual.

## 5. Seguridad
- **Protección XSS**: Se utiliza inserción de texto seguro mediante `innerText` y plantillas controladas.
- **Inyección SQL**: Al usar IndexedDB (No-SQL), las consultas parametrizadas de Dexie.js previenen ataques de inyección tradicionales.
- **Autenticación**: Las sesiones se gestionan de forma local y segura en el navegador del usuario.

## 6. Scripts de Respaldo y Recuperación
El sistema incluye una función de exportación nativa:
- **Exportar**: Genera un archivo `.json` con todos los datos.
- **Recuperación**: En caso de pérdida de datos, limpie la caché del navegador y el sistema se reiniciará con los valores por defecto (o implemente una función de importación en `js/db.js`).

---
*Desarrollado por el Asistente de IA - 2025*
