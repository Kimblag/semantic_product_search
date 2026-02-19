# Semantic Product Search

## Descripción

**Semantic Product Search** es un backend profesional que automatiza la búsqueda semántica de productos dentro de catálogos de proveedores.
Permite a los ejecutivos de ventas cargar requerimientos de clientes y obtener coincidencias exactas o semánticas del catálogo de proveedores, con score y justificación.
Incluye **trazabilidad completa y auditoría**, y un módulo de administración para gestionar usuarios, catálogos y parámetros de búsqueda.

---

## Stack Tecnológico

| Capa                        | Tecnología                                          |
| --------------------------- | --------------------------------------------------- |
| Backend                     | Node.js + Nest.js + TypeScript                      |
| Base de datos NoSQL         | MongoDB (catálogo, historial, logs)                 |
| Base de datos relacional    | SQLite + Prisma (usuarios, roles, ejecuciones)      |
| Búsqueda semántica          | OpenAI embeddings, Pinecone                         |
| Procesamiento en background | Bull + Redis                                        |
| Seguridad                   | Autenticación, roles, logs de auditoría según OWASP |

---

## Módulos principales

### Proveedores

* Admin puede crear, modificar y eliminar proveedores y sus items.
* Los items forman el catálogo.

### Clientes

* Ejecutivos pueden cargar clientes y requerimientos (CSV).
* Cada requerimiento dispara búsqueda semántica.
* Se guarda historial completo: quién, cuándo, qué resultados.
* Permite auditoría: admin ve acciones críticas de todos los usuarios.

---

## Funcionalidades clave

### Ejecutivos

* Subir requerimientos de clientes (CSV).
* Ejecutar búsqueda semántica y recibir resultados con score y justificación.
* Consultar historial de búsquedas propias.
* Exportar o enviar resultados a clientes.

### Administradores

* Gestionar usuarios y roles.
* Administrar catálogo de proveedores y productos (CRUD, normalización, categorías, tags).
* Configurar parámetros de búsqueda semántica.
* Monitorear tareas en segundo plano y consultar historial completo de ejecuciones.
* Acceder a logs de auditoría y resultados de cualquier usuario.

---

## Procesamiento en segundo plano

* Todas las tareas de generación de embeddings y búsquedas se ejecutan **sin bloquear al cliente**.
* Se utiliza **Bull + Redis**:

  * La API responde inmediatamente cuando se cargan requerimientos.
  * Un worker procesa embeddings y actualiza MongoDB y Pinecone.
* Permite múltiples ejecutivos ejecutando búsquedas simultáneamente sin degradar la performance.

---

## Arquitectura de flujo

```
Cliente -> Nest.js API -> Cola (Redis) -> Worker procesa embeddings -> MongoDB/Pinecone
```

---

## Input / Output

**Input:**

* Requerimientos: CSV (producto, cantidad opcional, cliente)
* Catálogo: documentos MongoDB (nombre, descripción, categoría, tags, atributos, proveedor)
* Parámetros de búsqueda: N coincidencias, thresholds, categorías prioritarias

**Output:**

* Resultados por requerimiento: productos coincidentes, score y justificación
* Exportable a CSV
* Historial accesible para ejecutivos y admin (usuario, cliente, fecha, ID de ejecución)

---

## Cómo levantarlo localmente

```bash
# Clonar repo
git clone <repo-url>
cd semantic-product-search

# Instalar dependencias
npm install

# Configurar .env
MONGO_URI=<tu mongo local o Atlas>
DATABASE_URL="file:./dev.db"   # para Prisma SQLite
OPENAI_API_KEY=<tu openai key>
PINECONE_API_KEY=<tu pinecone key>
REDIS_URL=<tu redis local>

# Migrar base relacional
npx prisma migrate dev

# Levantar Redis
redis-server

# Ejecutar app
npm run start:dev

# Swagger para probar endpoints
http://localhost:3000/docs
```

