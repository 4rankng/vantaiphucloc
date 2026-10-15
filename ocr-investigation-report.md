# OCR Production Incident Investigation — Oct 9–12, 2026

**Scope:** container-number OCR from delivered-trip photos (OpenRouter → claude-haiku-5.5).
**Method:** read-only code + git archaeology. No code, config, or data was modified.
**Evidence base:** repo source, git history, and the prod `ocr_jobs` stats supplied with the task. No prod DB/OpenRouter access from here — claims are labeled per rung: **GIT-VERIFIED** (diff/history), **CODE-READ** (source behavior), **HYPOTHESIS** (needs prod data to confirm).

---

## Executive summary

Three separate problems compounded into the visible spike:

| # | Problem | Since | Root cause | Status |
|---|---------|-------|------------|--------|
| 1 | Oct 9–10 success-rate collapse (95–100% → 64–85%) | Oct 9 — **before** any recent deploy | Upstream OpenRouter returning HTTP-200-with-empty-content on the Qwen models; zero-retry semantics converted every transient empty into a permanent job failure | HYPOTHESIS (high confidence) — no repo deploy exists in the window to blame |
| 2 | Fallback removed | Oct 11 20:43 (e7b42c98) | `OPENROUTER_MODELS` shrank from 2 models to 1 (Haiku 5.5); the chain code is generic, only the config list changed. Any single transient failure now ends the request | GIT-VERIFIED |
| 3 | `RuntimeError: arq pool not initialized` (41 failures) | Oct 11 ~20:50 deploy | Worker process never calls `init_arq_pool()` (only the API lifespan does). The 429-retry branch is the only retry path in the system, and it enqueues via `get_arq_pool()` → raises in the worker → caught → job marked failed. Latent since Jul 9 (346a0da2); the Haiku switch produced the first 429 storm that triggered it | CODE-READ, exact error string reproduced from source |

The Oct 9 dip **cannot** be caused by e7b42c98: the previous commit touching anything was Sep 12, and the OCR chain config/code was untouched between Jul 9 and Oct 11 20:43.

---

## 1. What exactly changed in e7b42c98 — GIT-VERIFIED

Commit `e7b42c98` ("feat(ocr): switch to Claude Haiku 5.5 as the sole OCR model") touched exactly two files:

### `backend/app/config.py`

```diff
 OPENROUTER_MODELS: list[tuple[str, str, float]] = [
-    ("Qwen3-VL-32B", "qwen/qwen3-vl-32b-instruct", 15.0),
-    ("Qwen3.7-Plus", "qwen/qwen3.7-plus", 55.0),
+    ("Claude-Haiku-5.5", "anthropic/claude-haiku-5.5", 30.0),
 ]
```

| Aspect | Before | After |
|---|---|---|
| Models tried per request | 2, in sequence | 1 |
| Per-call timeouts | 15s (VL-32B) then 55s (3.7-Plus), total budget ≈ 70s SLA | 30s single call |
| `OPENROUTER_MODEL` default (direct callers) | `qwen/qwen3-vl-32b-instruct` | `anthropic/claude-haiku-5.5` |

### `backend/app/contexts/operations/infrastructure/ocr.py`

**Docstrings and comments only.** Four hunks: module docstring, `_available_providers` docstring, `extract_container_numbers` docstring, and the deadline comment. No executable logic changed — the loop, timeouts, salvage, and error handling are byte-identical.

### Unchanged (explicitly verified)

- **Prompt** — `MULTI_CONTAINER_PROMPT` (ocr.py:61-101) untouched.
- **Request params** — `openrouter.py` not touched at all: `temperature: 0`, `max_tokens: 2048`, same base64 `image_url` payload, same headers, same shared `httpx.AsyncClient` (`_VISION_TIMEOUT = 60.0`, openrouter.py:26).
- **Error handling** — same failure-dict protocol.

### Companion commit efe4ce10 (benchmark only — no prod impact)

`make ocr` benchmark: removed `scripts/new_prompt.txt` and the `PROMPT=` Makefile knob so the benchmark always uses the single production prompt copy. Dev-tooling only; cannot affect prod OCR.

---

## 2. "Empty OpenRouter response" — where it is raised and why there is no retry — CODE-READ

### Where

`backend/app/contexts/operations/infrastructure/openrouter.py:210-218`:

```python
text = _extract_text(choices[0].get("message", {}).get("content"))
if not text:
    return {
        "success": False,
        "text": None,
        "error": "Empty OpenRouter response",
        ...
    }
```

Raised when OpenRouter returned **HTTP 200 with a `choices` entry whose `message.content` is empty or whitespace** (after `<think>` stripping, which is a no-op for Claude/Qwen instruct models here). Sibling case one branch up (line 202-209): HTTP 200 with **zero choices** → `"No response generated"`. Both shapes are how OpenRouter surfaces *upstream provider failures* as successful HTTP responses — the request reached OpenRouter, the upstream model produced nothing.

### Why there is no retry/backoff — three gates, each independent

1. **Client layer (`openrouter.py`): no retry by design.** Every outcome — HTTP error, timeout, empty content, parse failure — returns a failure dict in one call. One call = one `ocr_requests` attempt row (the attempt-ledger design in `extract_container_numbers`).
2. **Chain layer (`ocr.py:347-434`): "retry" means *try the next model in `OPENROUTER_MODELS`*.** On a non-429 failure the loop `continue`s to the next provider entry. Since e7b42c98 there is exactly **one** entry, so "try next" terminates the loop immediately. 429 is worse: it early-returns the whole chain (ocr.py:410-427) even when more models are configured ("deferring retry instead of trying next model").
3. **Job layer (`workers/tasks/ocr.py:307-341`): the retry machinery is gated exclusively on 429.**

```python
error = result.get("analytics_error") or result.get("error") or "OCR failed"
if result.get("rate_limited") and current_attempt < settings.OCR_MAX_RETRIES:   # line 308
    ... defer + re-enqueue via _enqueue_retry ...                               # line 327
...
return await _mark_failed(job_id, str(error), dead_letter=dead_letter)          # line 341
```

`OCR_MAX_RETRIES = 3` with exponential backoff (`OCR_RETRY_INITIAL_DELAY_SECONDS = 2.0`, cap `30.0`, jittered — `_retry_delay_seconds`, tasks/ocr.py:80-89) **exists and works** — but only for `rate_limited`. An "Empty OpenRouter response" flows straight to `_mark_failed` at line 341 with `analytics_error` = `"Empty OpenRouter response"` (set by the final return at ocr.py:524-533). That is the exact 87× signature in prod.

### Why jobs run exactly once (attempt_count ∈ {0, 1})

Consistent with the above: the only path that increments `attempt_count` past 1 is the 429 re-enqueue (which crashes — see §4). Everything else fails terminally on the first attempt. `attempt_count = 0` rows are jobs that failed inside `_load_processable_job` (not found / already terminal / queue-timeout) before the increment at tasks/ocr.py:262.

### Safe retry policy for this call site

The distinction that matters is **transient vs terminal**, and it is already representable in the failure dict:

| Error class | Examples from source | Classification | Policy |
|---|---|---|---|
| Rate limit | `HTTP 429` (`rate_limited: true`, `retry_after_seconds`) | transient | keep existing defer+backoff retry (fix the enqueue bug, §4) |
| Upstream hiccup surfaced as 200 | `Empty OpenRouter response`, `No response generated` | transient | **add to retry gate** — up to 2 re-enqueues, 2s/8s backoff |
| Network / hang | httpx exceptions, `timeout (30.0s)` from `asyncio.wait_for` | transient | add to retry gate, 1 re-enqueue |
| Server error | `HTTP 5xx` from `raise_for_status` path | transient | add to retry gate |
| Client/config error | `HTTP 401/402/403/404` | terminal | fail fast + alert (wrong key, out of credits, wrong slug) |
| Model genuinely saw nothing | success=True but `no valid numbers` and no salvage | near-terminal | at most 1 retry **on a different model**; retrying same model at temperature 0 mostly repeats |

Implementation seam (no new machinery): add a `transient: bool` (or `retryable: bool`) field to the failure dicts in `openrouter.py`, then change the worker gate at tasks/ocr.py:308 from `result.get("rate_limited")` to a classifier over `result`. All guards already exist and apply:

- job-age guard: `_job_age_seconds(job) + delay > OCR_QUEUE_TIMEOUT_SECONDS (900s)` → dead-letter (tasks/ocr.py:313-319);
- unique arq job id per attempt (`ocr:{job_id}:attempt:{attempt_count}`, workers/__init__.py:25-26) prevents double-processing;
- `next_retry_at` + `status="retrying"` bookkeeping already written.

Retrying at the *job* level (re-enqueue with `_defer_by`) rather than inside `call_openrouter_vision` is correct here: it keeps one `ocr_requests` row per HTTP call, keeps the event loop free, and respects the queue-timeout budget.

---

## 3. Multi-model sequence — did Haiku-as-sole-model remove a fallback? — GIT-VERIFIED + CODE-READ

**Yes.**

- `_available_providers()` (ocr.py:233-248) builds one chain entry per tuple in `OPENROUTER_MODELS`. The chain loop (ocr.py:347-494) is unchanged and fully generic: on timeout / HTTP error / empty response / `no valid numbers` it `continue`s to the next entry; the first entry returning ≥1 accepted identifier wins; leftovers go to salvage.
- Before e7b42c98: failure of Qwen3-VL-32B (15s cap) fell through to Qwen3.7-Plus (55s cap) **within the same request** — a built-in second chance against exactly the transient upstream behavior seen Oct 9-11.
- After: one entry. Any transient failure → loop ends → salvage over whatever text arrived (for an empty response: nothing) → `success: False` with `analytics_error` = the last provider error → job failed at tasks/ocr.py:341.
- The 429 early-return (ocr.py:410-427) short-circuits the chain both before and after — 429 never fell through to the second model even pre-switch.
- `openrouter.py` `max_tokens: 2048` etc. are per-call and unaffected by chain length.

**Restoring a fallback is a one-line config change** — add a second tuple, e.g. `("Qwen3.7-Plus", "qwen/qwen3.7-plus", 40.0)` after the Haiku entry. Deadline math: 30s + 40s = 70s = `OCR_DEADLINE_SECONDS` exactly; both fit inside the 90s job wrapper. The code needs zero changes.

---

## 4. The arq pool init bug — CODE-READ, exact string reproduced

### The failure chain (all four hops verified in source)

1. **Trigger:** OpenRouter returns 429 → `extract_container_numbers` early-returns `rate_limited: true` (ocr.py:410-427).
2. **Worker enters the retry branch** (tasks/ocr.py:308, `current_attempt=1 < OCR_MAX_RETRIES=3`) and calls `await _enqueue_retry(job, delay)` (line 327).
3. **`_enqueue_retry` → `enqueue_ocr_job`** (workers/__init__.py:29-55) → **`pool = get_arq_pool()`** (line 36) → **`get_arq_pool()` raises** (core/worker.py:37-43):

   ```python
   if _arq_pool is None:
       raise RuntimeError(
           "arq pool not initialized — call init_arq_pool() during lifespan"
       )
   ```

4. **Caught by the task's catch-all** (tasks/ocr.py:353-364) → `_mark_failed(job_id, f"{type(exc).__name__}: {exc}")` → `ocr_jobs.error_message` = **"RuntimeError: arq pool not initialized — call init_arq_pool() during lifespan"** — byte-identical to the prod signature (including the em-dash), truncated at 1024 chars (no-op here).

### Why the pool is never initialized in the worker

- `init_arq_pool()` is called **only in the API process lifespan** (`app/main.py:83`). `_arq_pool` is a module global — per-process.
- The worker runs as a separate container: `command: ["arq", "app.workers.worker.WorkerSettings"]` (deploy/docker-compose.prod.yml). `WorkerSettings.on_startup` (workers/worker.py:38-40) **only logs** `"Worker started"`. arq provides its own pool as `ctx["redis"]` — which the task uses for slots (line 231) — but `app.core.worker._arq_pool` stays `None` in that process forever.
- The API-side enqueue path is fine: routers call `enqueue_ocr_job` after the lifespan ran (e.g., delivered_trips.py:367-369).

So the latent bug: **any worker-task code path that (re)enqueues via `app.workers.enqueue*` crashes.** The 429-retry branch at tasks/ocr.py:327 is the only such path inside the `try`.

### Second, related hazard — the slots-full path

The other `_enqueue_retry` call site — concurrency-slots-full requeue (tasks/ocr.py:244) — sits **outside** the `try` (which begins at line 253). There the same `RuntimeError` escapes the task entirely: the DB row is left `status="queued"`, `error="OCR queue busy"`, arq retries the worker job up to `WORKER_MAX_TRIES=3`, and on exhaustion the row is stranded in `queued` until it ages out (if ever reloaded within 900s, it surfaces as the `"OCR job timed out in queue"` dead-letter — plausibly the 1× queue-timeout failure in prod).

### When introduced / which deploy broke it

- `a2642c07` (2026-04-28) centralized the arq pool; `346a0da2` (2026-07-09, "Implement OCR job queue and processing") introduced `tasks/ocr.py` including the worker-side re-enqueue paths. **Latent for ~3 months.**
- **No deploy "broke" it.** The Oct 11 20:43–20:50 deploy (`e7b42c98` + `ef635441` — also the GHCR image-registry switch) changed only the model config and image registry. What changed is the **trigger**: Haiku 5.5 as sole model → Anthropic models on OpenRouter enforce far tighter throughput/rate limits than the Qwen pair → the first meaningful 429 storm → the retry branch executed for the first time at scale → the latent bug fired 41×. This matches "started after a deploy ~26h ago" exactly (the two commits are ~26h old as of the investigation).
- Corollary: **41 arq failures ⇒ ≥41 OpenRouter 429s occurred post-switch.** That rate-limit pressure is itself a signal about the Haiku-only setup.

### Fix (pick one; B preferred)

- **A (minimal):** `WorkerSettings.on_startup`: `await init_arq_pool()` (and `close_arq_pool()` in `on_shutdown`). Makes the global pool valid in the worker.
- **B (preferred):** stop using the module-global in worker context — pass `ctx["redis"]` (already an `ArqRedis` on the same queue) into `enqueue_ocr_job` / `_enqueue_retry` as an optional `pool=` argument, falling back to `get_arq_pool()` for API callers. No second connection pool, no lifecycle coupling.
- Either way: move the slots-full requeue (line 244) inside the `try` so a failed requeue marks the job failed instead of stranding it in `queued`.
- **Regression test seam exists and is correct:** unit-test `process_ocr_job_task` with a fake `ctx` whose redis is a stub and a mocked `extract_container_numbers` returning a 429 result; assert a retry job is enqueued (or, pre-fix, watch it raise → `_mark_failed` with the RuntimeError). This test is red today and would have caught the bug in July.

---

## 5. Latency: timeouts vs p95 17s — CODE-READ

Timeout stack (innermost first):

| Layer | Limit | Source |
|---|---|---|
| Per-model call cap | `min(30.0, remaining of 70s deadline)` | ocr.py:356 + config `OPENROUTER_MODELS` |
| Provider-chain wall clock | `OCR_DEADLINE_SECONDS = 70.0` | config.py:62, ocr.py:345 |
| Whole `extract_container_numbers` in worker | `OCR_JOB_TIMEOUT_SECONDS = 90` | config.py:72, tasks/ocr.py:268-271 |
| httpx client (all components) | `_VISION_TIMEOUT = 60.0` | openrouter.py:26 — **unreachable for OCR** (the 30s cap always fires first); dead config, misleading but harmless |
| Queue age | `OCR_QUEUE_TIMEOUT_SECONDS = 900` | config.py:71, tasks/ocr.py:220 |

- p95 17s = **57% of the 30s per-call cap** — acceptable headroom; success avg 4.1s is healthy.
- Timeout-style failures are essentially absent from the 14d failure stats (1× queue timeout total). **Latency is not the failure driver** — the spike is empty responses (87×) + the arq crash (41×), not slow calls.
- Note for future tuning: a single 30s call leaves room for at most one more same-size attempt inside the 70s/90s budgets; a fallback model at ≤40s fits (30+40=70).

---

## Root-cause analysis: the Oct 9–11 spike

Key timeline fact — GIT-VERIFIED: **no commit touched this repo between Sep 12 (81f6ccd1, route-pricing tests) and Oct 11 20:43.** Whatever happened Oct 9-10 happened with byte-identical OCR code, prompt, and model config as the healthy Oct 3-8 period.

Ranked hypotheses:

**H1 (high confidence): upstream OpenRouter instability — 200-with-empty-content on the Qwen models — starting Oct 9, amplified to job failures by zero-retry semantics.**
- Predictions (falsifiable): `ocr_requests` rows on Oct 9-11 will show `provider='openrouter'`, `model LIKE 'qwen/%'`, `error='Empty OpenRouter response'`/`'No response generated'`, often with **short `latency_ms`** (fast empty 200s, not slow hangs) and clustered in bursts; OpenRouter's own activity log will show upstream errors for those requests. If instead empties show long latencies and correlate with specific photo subsets, H3 gains weight.
- Mechanism of impact: every empty → permanent failure (§2) → success-rate dip that mirrors the upstream outage windows (64.2% → partial recovery 84.6% → 79.5%).

**H2 (certain, compounding from Oct 11 20:50): the Haiku switch removed the in-request fallback and introduced 429s at scale.**
- Fallback removal (§3) means post-switch, H1-style empties can no longer be rescued by the second model within the same request.
- The Anthropic model's tighter rate limits produced ≥41 429s; each 429 then crashed the retry scheduler via the arq bug (§4), converting what the system *designed* to retry into hard failures. Expected Oct 11→12 residual failures = empties (if upstream still flaky) + arq crashes.

**H3 (low): input drift (photo characteristics).**
- No frontend, camera-handling, or upload-code change since Sep 12 in this repo. Would require an external change (new devices, new operation sites). Rule out via `ocr_requests`: if empties show *normal* latency and `numbers_found` distribution shifts, revisit. Not the leading explanation.

Oct 12's recovery to 90.5% is consistent with H1 subsiding while H2's arq failures persist (41 spread over the post-deploy window).

---

## Prioritized fix list

**P0 — Fix the arq pool bug in the worker** (eliminates the 41× hard-failure class; ~10 lines + test)
1. Option B from §4: thread `ctx["redis"]` through `enqueue_ocr_job`/`_enqueue_retry` (fallback to `get_arq_pool()` for API callers), or Option A: `init_arq_pool()` in `WorkerSettings.on_startup` + close in `on_shutdown`.
2. Move the slots-full `_enqueue_retry` (tasks/ocr.py:244) inside the `try` so requeue failures mark the job failed rather than stranding `queued` rows.
3. Regression test: `process_ocr_job_task` with mocked 429 result → assert retry enqueued (red today).

**P1 — Extend the retry policy to transient errors** (addresses the 87× empty-response class)
1. Add `transient`/`retryable` to failure dicts in `openrouter.py` (empty content, no choices, 5xx, timeouts, network exceptions).
2. Widen the worker gate at tasks/ocr.py:308 from `rate_limited`-only to the classifier; cap at 2 extra attempts (2s/8s backoff); keep the existing 900s job-age dead-letter guard; keep 4xx terminal with alerting.
3. Optional: one retry on a *different* model for `no valid numbers` (only meaningful once a fallback model exists).

**P1.5 — Restore a fallback model** (one-line config change, zero code)
- `OPENROUTER_MODELS = [("Claude-Haiku-5.5", "anthropic/claude-haiku-5.5", 30.0), ("Qwen3.7-Plus", "qwen/qwen3.7-plus", 40.0)]` — chain code supports it unchanged; 30+40=70s fits the deadline; also gives the `no valid numbers` retry somewhere to go. Note 429 on Haiku still short-circuits the chain by design (ocr.py:410-427) — acceptable once the retry path works.

**P2 — Monitoring**
1. Per-day, per-model success/error dashboard from `ocr_requests` (the table already records model, latency, error per attempt) with alerts on: daily success < 95%, any error-signature spike (`Empty OpenRouter response`, `HTTP 429`, `RuntimeError`).
2. Alert on `ocr_jobs` rows stuck `status='queued'` > 15 min (catches the slots-full stranding class) and on 429 frequency (rate-limit budget tracking for the Anthropic model).
3. Alert on OpenRouter credit balance / 402 responses (terminal class that should page, not retry).

**P3 — Hygiene**
1. Fix or remove the unreachable `_VISION_TIMEOUT = 60.0` vs 30s per-call cap mismatch (document the effective limit at the cap).
2. Log `finish_reason` from the OpenRouter response to distinguish empty-due-to-length vs empty-upstream in analytics.
3. Sweeper for stranded `queued` rows past 900s → dead-letter with a distinct error.
4. Add the transient-classification unit tests alongside the P0 regression test.

---

## Evidence & coverage table

| Claim | Rung | Evidence | Not covered |
|---|---|---|---|
| e7b42c98 diff contents (models/timeouts; docstrings only) | GIT-VERIFIED | `git show e7b42c98` | none for the diff itself |
| Prompt/params/error-handling unchanged | GIT-VERIFIED | diff shows no openrouter.py/prompt hunks | — |
| Fallback chain reduced 2→1 | GIT-VERIFIED + CODE-READ | diff + ocr.py:233-248, 347-494 | runtime behavior in prod |
| "Empty OpenRouter response" raise site & no-retry path | CODE-READ | openrouter.py:210-218; tasks/ocr.py:307-341 | live repro against OpenRouter |
| arq bug chain (429 → retry → get_arq_pool → RuntimeError → _mark_failed) | CODE-READ | tasks/ocr.py:308,327,353-364; workers/__init__.py:36; core/worker.py:37-43; main.py:83; worker.py:38-40 | prod stack trace attachment |
| arq bug latent since 346a0da2 (Jul 9); no deploy broke it | GIT-VERIFIED | `git log -S` on tasks/ocr.py, core/worker.py; commit gap Sep 12→Oct 11 | deploy audit log of the droplet |
| Oct 9-10 dip = upstream OpenRouter empties | HYPOTHESIS | absence of any local change in window + failure signature | prod SQL on `ocr_requests` by day/model/latency; OpenRouter activity log |
| p95 17s within budget | CODE-READ + supplied prod stats | config + ocr.py math vs user-provided p95 | per-day latency distribution |

**Suggested confirmation queries (run in prod, read-only):**

```sql
-- Which model produced the empties, when, and how fast (H1 test)
SELECT date_trunc('day', created_at) AS day, model, error, count(*),
       percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,
       percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms
FROM ocr_requests
WHERE created_at > now() - interval '14 days' AND success = false
GROUP BY 1, 2, 3 ORDER BY 1, 4 DESC;

-- 429 pressure + retry-crash coupling
SELECT date_trunc('hour', created_at) AS hr, error, count(*)
FROM ocr_requests
WHERE created_at > now() - interval '3 days' AND error LIKE 'HTTP 429%'
GROUP BY 1, 2 ORDER BY 1;

-- Stranded queued rows (slots-full escape hatch)
SELECT id, status, error_message, created_at, attempt_count
FROM ocr_jobs
WHERE status = 'queued' AND created_at < now() - interval '15 minutes'
ORDER BY created_at DESC LIMIT 50;
```
