# Semantic Product Search

Backend NestJS para gestionar catálogo de proveedores, requerimientos de clientes y búsqueda semántica de productos con embeddings.

## Contexto

Equipos comerciales suelen comparar requerimientos de clientes contra catálogos de proveedores de forma manual, lenta y difícil de auditar.

Este proyecto reduce ese esfuerzo al:

- normalizar carga de catálogos/requerimientos vía CSV,
- ejecutar matching semántico con score de similitud,
- mantener trazabilidad por usuario, cliente y ejecución,
- permitir exportación de resultados para operación comercial.

## Importancia

- Menor tiempo de respuesta comercial para cotizaciones.
- Mayor consistencia entre ejecutivos al usar un criterio de matching común.
- Mejor gobernanza por auditoría, control de roles y trazabilidad de acciones.

## Funcionalidades

- Autenticación JWT con refresh token y control de acceso por roles/permisos.
- Gestión de usuarios, roles, clientes y proveedores.
- Carga de catálogos y requerimientos por archivo CSV (con validación de formato).
- Procesamiento asíncrono con cola interna en memoria (concurrencia configurable), sin Bull/Redis.
- Matching semántico con OpenAI + Pinecone.
- Historial y exportación CSV de resultados de matching.
- Auditoría de acciones en MongoDB (colección con TTL para limpieza automática).

## Tecnologías

- Backend: NestJS 11 + TypeScript.
- Base relacional: Prisma + SQLite.
- Base documental: MongoDB + Mongoose.
- Vector DB: Pinecone.
- Embeddings: OpenAI.
- Seguridad: JWT, guards globales, throttling y Helmet.

## Arquitectura de datos

- SQLite (Prisma): usuarios, roles, permisos, clientes, proveedores, requerimientos, refresh tokens.
- MongoDB: resultados de matching (`matching_results`) y auditoría (`audit_logs`).
- Pinecone: índice vectorial para búsqueda semántica.

## Flujo general

```text
Cliente/API Consumer
	-> NestJS Controllers + Guards
	-> Services de dominio
	-> Cola interna (QueueService, concurrencia=2)
	-> Matching + Embeddings
	-> Persistencia (SQLite + MongoDB + Pinecone)
```

## Rutas principales

- `/auth`
- `/users`
- `/roles`
- `/clients`
- `/providers`
- `/requirements`
- `/docs` (Swagger)

## Ejemplo de uso

1. Un admin crea proveedor y carga catálogo CSV (`/providers/:id/catalog`).
2. Un ejecutivo crea/selecciona cliente y sube requerimiento CSV (`/requirements/:id`).
3. El procesamiento queda en background y se ejecuta matching semántico.
4. El usuario consulta historial/resultados (`/requirements`, `/requirements/:id`).
5. Se exporta el resultado en CSV (`/requirements/:id/export/csv`).

## Decisiones de implementación

- Cola en memoria en lugar de Bull/Redis:
	- Ventaja: menor complejidad operativa local.
	- Trade-off: no hay persistencia de jobs entre reinicios.
- Doble persistencia (SQLite + MongoDB):
	- Ventaja: separa datos transaccionales de documentos de resultados/auditoría.
	- Trade-off: más componentes a operar y sincronizar.
- Embeddings externos (OpenAI/Pinecone):
	- Ventaja: búsqueda semántica de mayor calidad.
	- Trade-off: dependencia de servicios externos y costo por uso.

## Variables de entorno

La aplicación valida estas variables al arrancar:

```env
DATABASE_URL=file:./dev.db
MONGO_URL=mongodb://localhost:27017/semantic_product_search

JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_REFRESH_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_ISSUER=semantic-product-search
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN_SECONDS=604800

HASH_SALT_ROUNDS=10
HASH_SALT_ROUNDS_REFRESH=10
MAX_FAILED_ATTEMPTS=5
LOCK_TIME=900000

PINECONE_API_KEY=...
PINECONE_REGION=...
PINECONE_INDEX_NAME=...
PINECONE_CLOUD=...

EMBEDDINGS_MODEL=text-embedding-3-small
OPENAI_API_KEY=...

PORT=3000
NODE_ENV=development
```

## Ejecutar en local

### 1) Requisitos previos

- Node.js 20+
- pnpm 10+
- MongoDB accesible
- Cuenta/API keys de OpenAI y Pinecone

### 2) Instalar dependencias

```bash
pnpm install
```

### 3) Configurar `.env`

Crear archivo `.env` en la raíz del proyecto con las variables de la sección anterior.

### 4) Inicializar base relacional (Prisma)

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

### 5) (Opcional) Sembrar datos base

```bash
pnpm run seed
```

El seed crea permisos, roles (`Admin`, `Executive`) y un usuario root:

- Email: `root@system.com`
- Password: `root12345678`

### 6) (Opcional) Crear/validar índice en Pinecone

```bash
pnpm run index:pinecone
```

### 7) Levantar el servidor

```bash
pnpm run start:dev
```

API local:

- `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

## Ejecutar tests

```bash
# unit tests
pnpm run test

# unit tests en modo watch
pnpm run test:watch

# cobertura
pnpm run test:cov

# e2e
pnpm run test:e2e
```

## Seguridad

- Autenticación JWT + refresh token.
- Control de acceso por roles/permisos.
- Throttling en endpoints sensibles (ej. login).
- `helmet` y validación estricta de DTOs (`ValidationPipe`).

## Producción

- Ejecutar con `NODE_ENV=production` y secretos gestionados por un secret manager.
- Usar una base relacional gestionada (en vez de SQLite) si se requiere escalado horizontal.
- Ejecutar MongoDB y Pinecone en entornos estables y monitoreados.
- Añadir observabilidad: logs estructurados, métricas y alertas por error rate/latencia.

## Limitaciones

- La cola interna no persiste trabajos si el proceso se reinicia.
- Dependencia de OpenAI/Pinecone para el matching semántico.
- No incluye en este repositorio un pipeline de CI/CD listo para producción.

## Comandos útiles

```bash
pnpm run build
pnpm run lint
pnpm run format
pnpm run start:prod
```