# Task Assignment

## Roles

### Agent 1 — Independent Reviewer

- Validate requirements and acceptance criteria.
- Review architecture and file-operation proposals.
- Inspect implementation and tests.
- Identify confirmed defects and material risks.
- Produce `REVIEW_REPORT.md`.
- Avoid unrequested implementation changes.

### Agent 2 — Project Manager and Primary Engineer

- Gather and maintain project requirements.
- Propose architecture and implementation plan.
- Implement approved functionality.
- Add and run tests.
- Maintain file-change evidence.
- Submit review requests and respond to findings.

### Project Owner

- Define product scope and priorities.
- Approve requirements and architecture.
- Resolve disagreements.
- Make the final release decision.

## Workflow

1. Project Owner or Agent 2 completes the brief and requirements.
2. Agent 2 proposes architecture and file operations.
3. Project Owner approves scope and architecture.
4. Agent 2 implements and records changes.
5. Agent 2 submits a review request with evidence.
6. Agent 1 independently reviews the submission.
7. Agent 2 addresses findings or documents accepted risks.
8. Project Owner makes the final readiness decision.

## Evidence Required for Review

- Relevant requirements and acceptance criteria.
- Architecture and file-operation plan.
- Git diff or complete changed files.
- Test commands and unabridged results.
- Known limitations and unresolved risks.

## Current Assigned Work

The following items are recorded for later assignment and tracking. They are not authorization to modify implementation files. No item should be executed unless the Project Owner explicitly requests the work.

| Work item | Assigned role | Dependency | Status |
|---|---|---|---|
| Complete `PROJECT_BRIEF.md` and `REQUIREMENTS.md` with approved project scope, users, and acceptance criteria | Project Owner / Agent 2 | Project Owner input | NOT STARTED |
| Update `ARCHITECTURE.md` and `FILE_OPERATION_PLAN.md` to reflect the existing backend and the astronaut-dataset decision | Agent 2 | Approved requirements and dataset direction | NOT STARTED |
| Resolve the TypeScript type-check failures and document a passing type-check command | Agent 2 | Decision on supported runtime and type strategy | BLOCKED |
| Decide whether to add an initial migration under `backend/src/migrations/` or intentionally defer/remove the migration runner | Project Owner / Agent 2 | Approved persistence strategy | BLOCKED |
| Decide whether `astronaut-earth-baseline-1.db` is part of the product; if yes, define the approved schema/API integration and tests | Project Owner / Agent 2 | Product scope decision | BLOCKED |
| Define Supabase schema, Row Level Security, credential handling, and deployment behavior | Agent 2 | Approved architecture and Supabase environment | NOT STARTED |
| Update `FILE_CHANGE_REPORT.md`, run validation, and attach commands/results to `REVIEW_REQUEST.md` | Agent 2 | Completed authorized implementation work | NOT STARTED |
| Perform substantive independent review using the complete evidence packet | Agent 1 | Requirements, architecture, diff, and test evidence | BLOCKED |
| Make final readiness and release decision | Project Owner | Agent 1 review report | BLOCKED |

### Backend Discrepancy Fixes

These items are assigned to Agent 2 for backend-only correction. They do not authorize changes to `html/`, `js/`, `css/`, or `assets/`.

| Work item | Assigned role | Dependency | Status |
|---|---|---|---|
| Fix or remove the `dev` script reference to missing `backend/src/index.ts` | Agent 2 | Approved backend runtime entrypoint | ASSIGNED |
| Resolve TypeScript errors and add a passing type-check command | Agent 2 | Runtime and type-declaration decision | ASSIGNED |
| Add or intentionally defer the migration workflow and document the decision | Agent 2 | Approved persistence strategy | ASSIGNED |
| Align the SQLite database path, comments, documentation, and tests | Agent 2 | Canonical database-location decision | ASSIGNED |
| Fix Supabase `team_members` composite-key upsert handling | Agent 2 | Valid PostgreSQL conflict target | ASSIGNED |
| Fix PostgreSQL timestamp conversion and validate generated schema SQL | Agent 2 | Supabase schema validation | ASSIGNED |
| Do not integrate the astronaut dataset or invent product behavior without explicit product approval | Agent 2 | Project Owner decision | HOLD |
