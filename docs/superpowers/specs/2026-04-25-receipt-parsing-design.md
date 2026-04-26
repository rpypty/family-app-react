# Receipt Parsing Design

## Summary

Add an asynchronous receipt parsing flow for expenses.
The user uploads one receipt image, chooses the allowed expense categories, and gets a status indicator near the existing add-expense action.
When parsing is complete, the indicator opens a separate draft-review form with a preliminary list of aggregated expenses.
The user can edit, remove, approve, or cancel the draft.
Approval creates all final expenses on the backend in a single transaction.

## Current Context

Frontend lives in this repository.
Expense UI is currently centered around a route-driven single-expense modal:

- [src/app/routing/routes.ts](/Users/ashpak/Pet/family-app-react/src/app/routing/routes.ts)
- [src/features/miniapps/expense/expenses/screens/ExpensesScreen.tsx](/Users/ashpak/Pet/family-app-react/src/features/miniapps/expense/expenses/screens/ExpensesScreen.tsx)
- [src/features/miniapps/expense/expenses/components/ExpenseFormModal.tsx](/Users/ashpak/Pet/family-app-react/src/features/miniapps/expense/expenses/components/ExpenseFormModal.tsx)

Backend lives in `../family-app-go`.
Expense CRUD is synchronous JSON API today.
There is no existing file upload pipeline or persistent async job infrastructure.
The backend HTTP router has a global request timeout, so receipt parsing should not run inside the upload request.

## Goals

- Let a user upload a receipt image and choose the category set used for classification.
- Parse receipt line items with OpenAI vision + structured output.
- Aggregate parsed line items into draft expenses grouped by category.
- Keep parsed data as draft data until the user explicitly approves it.
- Create all approved expenses in one backend transaction.
- Keep the flow visible through a compact status icon near the add-expense button.
- Design the data model so multiple receipt images can be supported later without replacing the core tables.

## Non-Goals For MVP

- No offline receipt parsing.
- No direct OpenAI calls from the frontend.
- No automatic creation of final expenses before user approval.
- No item-level editing UI in the first version.
- No training/fine-tuning loop in the first version.
- No support for multiple receipt images in the UI in the first version.

## Product Decisions

- MVP supports exactly one receipt image per parse job.
- Backend and database model should allow multiple files per parse job later.
- The receipt parsing flow is online-only.
- The main expense list should show a receipt status action near the existing add-expense action.
- The status action opens the active parse job if one exists.
- Final approval creates a batch of regular expenses.
- Batch creation must be transactional on the backend.
- OpenAI API is used behind a backend adapter.

## UX Flow

### Entry Point

Add a secondary floating action near the existing `+` expense button.
The button uses a receipt/document scan style icon.

States:

- `idle`: opens the upload form.
- `queued` or `processing`: opens a status form with progress text and a cancel action.
- `ready`: opens the draft review form and shows a visible success badge.
- `failed`: opens an error form with retry/cancel actions.

The status button should stay available if the user closes the form while parsing continues.

### Upload Form

Fields:

- receipt image input, one file in MVP
- category selection
- optional date
- optional currency, defaulting to family default currency

Category selection modes:

- selected categories
- all categories

For MVP, `all categories` means "send all current family categories to the backend".
If category count becomes large, the backend can cap or rank categories later.

### Status Form

For `queued` and `processing`, show a compact modal or bottom sheet with:

- current status
- selected file name
- selected category count or "all categories"
- cancel action

The frontend polls the active job while it is not terminal.

### Draft Review Form

When the job is `ready`, open a separate form from the single-expense modal.
The draft form shows aggregated draft expenses:

- title
- amount
- currency
- category
- optional confidence or warning marker
- delete action

Editable fields in MVP:

- title
- amount
- category

Actions:

- approve batch
- cancel parse result
- delete a draft expense from the batch

Post-MVP adds expandable line-item details under each aggregated draft expense.

## Async Lifecycle

Statuses:

- `queued`: job is stored, file metadata is stored, worker has not started.
- `processing`: worker is calling OpenAI and normalizing the response.
- `ready`: draft expenses are available for user review.
- `failed`: parsing failed or validation could not produce any useful draft.
- `approved`: user approved and final expenses were created.
- `cancelled`: user cancelled before approval.

Only one active job is needed for MVP.
Active means `queued`, `processing`, `ready`, or `failed`.

If the user creates a new job while an active job exists, return `409 active_receipt_parse_exists`.
This keeps the UI simple and avoids unclear status-button behavior.

## Backend API

All endpoints are authenticated under `/api`.

### Create Parse Job

```http
POST /api/receipt-parses
Content-Type: multipart/form-data
```

Fields:

- `receipt`: image file
- `category_ids`: repeated string field, optional
- `all_categories`: boolean string, optional
- `date`: `YYYY-MM-DD`, optional
- `currency`: currency code, optional

Rules:

- exactly one receipt file in MVP
- either `all_categories=true` or at least one `category_ids` value
- file size limit should be explicit, for example 8 MB
- allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

Response:

```json
{
  "id": "receipt-parse-id",
  "status": "queued",
  "created_at": "2026-04-25T12:00:00Z"
}
```

### Get Active Parse Job

```http
GET /api/receipt-parses/active
```

Response when no active job:

```json
{
  "item": null
}
```

Response with active job:

```json
{
  "item": {
    "id": "receipt-parse-id",
    "status": "processing",
    "created_at": "2026-04-25T12:00:00Z",
    "updated_at": "2026-04-25T12:00:05Z"
  }
}
```

### Get Parse Job

```http
GET /api/receipt-parses/{id}
```

Ready response:

```json
{
  "id": "receipt-parse-id",
  "status": "ready",
  "receipt": {
    "merchant_name": "Store",
    "purchased_at": "2026-04-25",
    "currency": "BYN",
    "detected_total": 42.35,
    "items_total": 42.35
  },
  "draft_expenses": [
    {
      "id": "draft-id-1",
      "title": "Products",
      "amount": 36.10,
      "currency": "BYN",
      "category_id": "category-id-1",
      "confidence": 0.82,
      "warnings": []
    }
  ],
  "warnings": []
}
```

Failed response:

```json
{
  "id": "receipt-parse-id",
  "status": "failed",
  "error": {
    "code": "llm_request_failed",
    "message": "Failed to parse receipt"
  }
}
```

### Approve Parse Job

```http
POST /api/receipt-parses/{id}/approve
Content-Type: application/json
```

Request:

```json
{
  "expenses": [
    {
      "draft_id": "draft-id-1",
      "title": "Products",
      "amount": 36.10,
      "currency": "BYN",
      "category_ids": ["category-id-1"],
      "date": "2026-04-25"
    }
  ]
}
```

Response:

```json
{
  "status": "approved",
  "expenses": [
    {
      "id": "expense-id-1",
      "date": "2026-04-25",
      "amount": 36.10,
      "currency": "BYN",
      "title": "Products",
      "category_ids": ["category-id-1"]
    }
  ]
}
```

Backend behavior:

- verify parse job belongs to current family
- allow approval only from `ready`
- validate title, amount, currency, and categories
- create all expenses inside one transaction
- mark parse job as `approved`
- store user-edited final draft values for future quality analysis

### Cancel Parse Job

```http
POST /api/receipt-parses/{id}/cancel
```

Rules:

- allow from `queued`, `processing`, `ready`, or `failed`
- mark as `cancelled`
- worker should stop before OpenAI call if it sees cancellation
- if the OpenAI call is already in flight, ignore its result if the job is cancelled before persistence

## Backend Data Model

### `receipt_parse_jobs`

Columns:

- `id uuid primary key`
- `family_id uuid not null`
- `user_id uuid not null`
- `status text not null`
- `category_mode text not null`
- `selected_category_ids jsonb not null default '[]'`
- `requested_date date null`
- `requested_currency text null`
- `merchant_name text null`
- `purchased_at date null`
- `currency text null`
- `detected_total numeric(12,2) null`
- `items_total numeric(12,2) null`
- `provider text null`
- `model text null`
- `raw_llm_response jsonb null`
- `error_code text null`
- `error_message text null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `completed_at timestamptz null`
- `approved_at timestamptz null`
- `cancelled_at timestamptz null`

Indexes:

- `(family_id, status)`
- `(family_id, created_at desc)`

### `receipt_parse_files`

Columns:

- `id uuid primary key`
- `job_id uuid not null references receipt_parse_jobs(id)`
- `ordinal int not null`
- `file_name text not null`
- `content_type text not null`
- `size_bytes bigint not null`
- `storage_key text null`
- `sha256 text null`
- `created_at timestamptz not null`

For MVP, `storage_key` can be null if the backend only keeps the file in memory long enough for the worker.
If the worker runs outside the request process, persistent storage is required.

### `receipt_parse_items`

Columns:

- `id uuid primary key`
- `job_id uuid not null references receipt_parse_jobs(id)`
- `line_index int not null`
- `raw_name text not null`
- `normalized_name text null`
- `quantity numeric(12,3) null`
- `unit_price numeric(12,2) null`
- `line_total numeric(12,2) not null`
- `llm_category_id uuid null`
- `llm_category_confidence numeric(4,3) null`
- `final_category_id uuid null`
- `final_line_total numeric(12,2) null`
- `is_deleted boolean not null default false`
- `edited_by_user boolean not null default false`
- `created_at timestamptz not null`

### `receipt_parse_draft_expenses`

Columns:

- `id uuid primary key`
- `job_id uuid not null references receipt_parse_jobs(id)`
- `title text not null`
- `amount numeric(12,2) not null`
- `currency text not null`
- `category_id uuid not null`
- `confidence numeric(4,3) null`
- `warnings jsonb not null default '[]'`
- `final_title text null`
- `final_amount numeric(12,2) null`
- `final_category_id uuid null`
- `is_deleted boolean not null default false`
- `edited_by_user boolean not null default false`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

## Backend Modules

Recommended package split in `../family-app-go`:

- `internal/domain/receipts/model.go`
- `internal/domain/receipts/repository.go`
- `internal/domain/receipts/service.go`
- `internal/repository/postgres/receipts/postgres.go`
- `internal/transport/httpserver/handler/receipts/handlers.go`
- `internal/repository/http/openai/receipts.go`

Core interfaces:

```go
type ReceiptParser interface {
	ParseReceipt(ctx context.Context, input ParseReceiptInput) (ParseReceiptResult, error)
}

type ExpenseBatchCreator interface {
	CreateExpense(ctx context.Context, input expenses.CreateExpenseInput) (*expenses.ExpenseWithCategories, error)
}
```

The receipt domain should depend on an expense creation interface instead of creating raw expense rows itself.
This keeps category validation and currency conversion consistent with normal expense creation.

## Worker Design

MVP can use an in-process worker loop:

- `POST /receipt-parses` stores job and enqueues its ID in memory.
- worker picks queued jobs and moves them to `processing`.
- worker calls OpenAI through `ReceiptParser`.
- worker stores items and draft expenses.
- worker marks job as `ready` or `failed`.

Important limitation:

- in-memory queue loses queued jobs on process restart.

Mitigation for MVP:

- on app startup, mark stale `processing` jobs as `failed` or requeue `queued` jobs.
- keep the model extensible so a database polling worker can replace the in-memory queue later.

Longer-term worker:

- poll DB for `queued` jobs with `FOR UPDATE SKIP LOCKED`
- run bounded concurrency
- support retries with `attempt_count` and `next_attempt_at`

## OpenAI Integration

Use OpenAI only from the Go backend.
Frontend should never receive or store `OPENAI_API_KEY`.

Official docs to validate during implementation:

- [Responses API](https://platform.openai.com/docs/api-reference/responses/create)
- [Images and vision](https://platform.openai.com/docs/guides/images)
- [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)

Recommended backend config:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`, optional for tests/proxies
- `OPENAI_TIMEOUT`, default around `60s`
- `RECEIPT_PARSER_ENABLED`
- `RECEIPT_PARSER_MAX_FILE_SIZE_BYTES`

Use the Responses API with image input and Structured Outputs.
Structured Outputs are preferable to JSON mode because the backend needs schema adherence, not just valid JSON.

### LLM Output Shape

Target schema:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["receipt", "items", "warnings"],
  "properties": {
    "receipt": {
      "type": "object",
      "additionalProperties": false,
      "required": ["merchant_name", "purchased_at", "currency", "detected_total"],
      "properties": {
        "merchant_name": { "type": ["string", "null"] },
        "purchased_at": { "type": ["string", "null"] },
        "currency": { "type": ["string", "null"] },
        "detected_total": { "type": ["number", "null"] }
      }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "raw_name",
          "normalized_name",
          "quantity",
          "unit_price",
          "line_total",
          "category_id",
          "category_confidence"
        ],
        "properties": {
          "raw_name": { "type": "string" },
          "normalized_name": { "type": ["string", "null"] },
          "quantity": { "type": ["number", "null"] },
          "unit_price": { "type": ["number", "null"] },
          "line_total": { "type": "number" },
          "category_id": { "type": ["string", "null"] },
          "category_confidence": { "type": ["number", "null"] }
        }
      }
    },
    "warnings": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

Prompt rules:

- pass categories as IDs and names
- require category IDs from the provided list only
- allow `null` category when no provided category is suitable
- require monetary values as decimal numbers, not formatted strings
- require the model to preserve receipt line items rather than pre-aggregating them
- backend performs aggregation after validating items

## Backend Validation And Aggregation

Validation:

- reject negative or zero line totals
- round money to 2 decimal places
- ignore categories not belonging to the family
- set unknown categories to `null` and put the item into an "unmatched" warning group
- compare `detected_total` and `items_total`
- if mismatch is above threshold, keep the draft but add a warning

Aggregation:

- group valid items by `category_id`
- create one draft expense per category
- title can be the category name for MVP
- amount is sum of line totals
- confidence is min or weighted average of line-item confidences
- items with null category should produce a separate draft only if the product decision allows an uncategorized expense

Recommended mismatch threshold:

- absolute threshold: `0.05`
- relative threshold: `1%`

If mismatch exceeds threshold, show a warning but do not block review.
Approval validates only the edited draft expenses.

## Frontend API Client

Add a receipt API module:

- `src/features/miniapps/expense/receipts/api/receiptParses.ts`

`apiFetch` currently defaults `Content-Type` to `application/json` when a body exists.
For `FormData`, update the shared client so it does not set JSON content type for multipart bodies.

Required frontend API calls:

- `createReceiptParse(formData)`
- `getActiveReceiptParse()`
- `getReceiptParse(id)`
- `approveReceiptParse(id, payload)`
- `cancelReceiptParse(id)`

## Frontend Components

Suggested module:

- `src/features/miniapps/expense/receipts/components/ReceiptParseAction.tsx`
- `src/features/miniapps/expense/receipts/components/ReceiptParseDialog.tsx`
- `src/features/miniapps/expense/receipts/components/ReceiptDraftExpenseRow.tsx`
- `src/features/miniapps/expense/receipts/hooks/useReceiptParseJob.ts`

Route additions:

- `/miniapps/expenses/receipt`
- `/miniapps/expenses/receipt/{id}`

Alternatively, the first version can keep the dialog state local to `ExpensesScreen`.
Using routes is more consistent with the current expense modal design and makes refresh/back behavior easier.

Polling:

- poll every 2 seconds for `queued` and `processing`
- stop polling for `ready`, `failed`, `approved`, or `cancelled`
- refresh active job on expense screen mount
- refresh expense list after successful approve

## Error Handling

Backend error codes:

- `receipt_parser_disabled`
- `active_receipt_parse_exists`
- `invalid_receipt_file`
- `receipt_file_too_large`
- `receipt_parse_not_found`
- `receipt_parse_invalid_status`
- `receipt_parse_cancelled`
- `llm_request_failed`
- `llm_invalid_response`
- `receipt_parse_empty`
- `category_not_found`

Frontend copy should be specific enough to let the user recover:

- file too large
- unsupported file type
- parsing failed, retry with a clearer photo
- another receipt is already being processed
- category was deleted before approval

## Testing

Backend:

- create job validates file/category input
- active job conflict returns `409`
- worker maps parser success to `ready`
- worker maps parser error to `failed`
- invalid category IDs from LLM are ignored or marked unmatched
- aggregation groups by category
- approve creates all expenses in one transaction
- approve rolls back when one expense is invalid
- cancel prevents approval

Frontend:

- upload form sends `FormData` without JSON content type
- status action reflects job statuses
- polling stops on terminal statuses
- ready job opens draft review
- draft row edit updates approve payload
- delete draft row removes it from approve payload
- approve refreshes the expense list
- failed job shows retry/cancel options

## Implementation Plan

1. Add backend migrations for receipt parse jobs, files, items, and draft expenses.
2. Add backend receipt domain models, repository, service, and handler skeleton.
3. Add mock parser implementation to complete the async lifecycle without OpenAI.
4. Add `POST`, `GET active`, `GET by id`, `approve`, and `cancel` endpoints.
5. Add transactional batch approval through the existing expense service.
6. Add frontend receipt API client and FormData-safe `apiFetch` behavior.
7. Add status action near the add-expense button.
8. Add upload/status/review dialog and polling hook.
9. Wire approve to refresh the expense list.
10. Add OpenAI parser adapter behind the backend parser interface.
11. Add env documentation for OpenAI configuration.
12. Run backend and frontend tests.

## Open Questions

- Should unmatched items create a separate draft expense, or should they block approval until categorized?
- Should the user be allowed to approve when receipt total and items total mismatch?
- Should the backend persist receipt images for debugging, or discard them after parsing?
- Should `ready` jobs expire automatically after several days?
- Should there be a history screen for approved/cancelled parse jobs, or only the active job indicator?

## Post-MVP

- Multiple receipt images per parse job.
- Expand aggregated expenses to show source receipt items.
- Item-level category and amount editing.
- Persist explicit correction events for quality analysis.
- Retry failed parse jobs with the same uploaded files.
- Background DB polling worker with retry/backoff.
- Provider fallback or model switching.
