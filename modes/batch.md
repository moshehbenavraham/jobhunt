# Modo: batch - Procesamiento Masivo de Ofertas

Dos modos de uso: **conductor interactivo** (navega portales en tiempo real)
o **standalone** (script para URLs ya recolectadas).

## Arquitectura

```text
Conductor interactivo (browser automation)
  |
  | Chrome: navega portales (sesiones logueadas)
  | Lee DOM directo - el usuario ve todo en tiempo real
  |
  |- Oferta 1: lee JD del DOM + URL
  |  -> codex exec worker -> result.json + report .md + PDF + tracker-line
  |
  |- Oferta 2: click siguiente, lee JD + URL
  |  -> codex exec worker -> result.json + report .md + PDF + tracker-line
  |
  `- Fin: merge tracker-additions -> applications.md + resumen
```

Cada worker es un `codex exec` hijo con prompt resuelto y contrato JSON
estructurado. El conductor solo orquesta.

## Archivos

```
batch/
  batch-input.tsv               # URLs (por conductor o manual)
  batch-state.tsv               # Progreso (auto-generado, gitignored)
  batch-runner.sh               # Script orquestador standalone
  batch-prompt.md               # Prompt template para workers
  worker-result.schema.json     # Contrato JSON final de cada worker
  logs/                         # Un log por oferta (gitignored)
  tracker-additions/            # Lineas de tracker (gitignored)
```

## Modo A: Conductor interactivo

1. **Leer estado**: `batch/batch-state.tsv` -> saber que ya se proceso
2. **Navegar portal**: Chrome -> URL de busqueda
3. **Extraer URLs**: Leer DOM de resultados -> extraer lista de URLs -> append a `batch-input.tsv`
4. **Para cada URL pendiente**:
   a. Chrome: click en la oferta -> leer JD text del DOM
   b. Guardar JD a `/tmp/batch-jd-{id}.txt`
   c. Calcular siguiente REPORT_NUM secuencial
   d. Resolver `batch/batch-prompt.md` con `URL`, `JD_FILE`, `REPORT_NUM`,
      `DATE`, `ID` y `RESULT_FILE`
   e. Ejecutar via Bash:
   ```bash
   codex exec \
     -C "$PWD" \
     --dangerously-bypass-approvals-and-sandbox \
     --output-schema batch/worker-result.schema.json \
     --output-last-message batch/logs/{report_num}-{id}.last-message.json \
     --json \
     - < /tmp/resolved-batch-prompt-{id}.md > batch/logs/{report_num}-{id}.log 2>&1
   ```
   f. Leer `batch/logs/{report_num}-{id}.result.json` y actualizar
      `batch-state.tsv` (`completed`, `partial`, `failed` o `skipped`)
   g. Chrome: volver atras -> siguiente oferta
5. **Paginacion**: Si no hay mas ofertas -> click "Next" -> repetir
6. **Fin**: Merge `tracker-additions/` -> `applications.md` + resumen

## Modo B: Script standalone

```bash
batch/batch-runner.sh [OPTIONS]
```

Opciones:

- `--dry-run` - lista pendientes sin ejecutar
- `--retry-failed` - solo reintenta fallidas
- `--start-from N` - empieza desde ID N
- `--parallel N` - N workers en paralelo
- `--max-retries N` - intentos por oferta (default: 2)

## Formato batch-state.tsv

```
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-...	2026-...	002	4.2	-	0
2	https://...	partial	2026-...	2026-...	003	4.0	warnings: pdf-not-generated	0
3	https://...	failed	2026-...	2026-...	004	-	semantic: missing-jd-text	0
4	https://...	failed	2026-...	2026-...	005	-	infrastructure: exit 17; worker timed out	1
```

## Resumabilidad

- Si muere -> re-ejecutar -> lee `batch-state.tsv` -> skip `completed`,
  `partial` y `skipped`
- Lock file (`batch-runner.pid`) previene ejecucion doble
- `--retry-failed` solo reintenta fallas de infraestructura con retries por
  debajo de `--max-retries`
- Cada worker es independiente: fallo en oferta #47 no afecta a las demas

## Workers (`codex exec`)

Cada worker recibe `batch-prompt.md` como system prompt. Es self-contained.

El worker produce:

1. Report `.md` en `reports/`
2. PDF en `output/`
3. Linea de tracker en `batch/tracker-additions/{id}.tsv`
4. JSON final en `batch/logs/{report_num}-{id}.result.json`
5. Copia del mensaje final en `batch/logs/{report_num}-{id}.last-message.json`

## Gestion de errores

| Error                | Recovery                                                        |
| -------------------- | --------------------------------------------------------------- |
| URL inaccesible      | Worker falla semanticamente o por infraestructura segun el caso |
| JD detras de login   | Conductor intenta leer DOM. Si falla -> `failed`               |
| Portal cambia layout | Conductor razona sobre HTML, se adapta                          |
| Worker crashea       | Runner marca `failed` con prefijo `infrastructure:`. Retry con `--retry-failed` |
| Conductor muere      | Re-ejecutar -> lee state -> skip terminales y retoma pendientes |
| PDF falla            | Resultado `partial`: el report puede quedar util aunque el PDF no |
