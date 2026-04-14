# Feature: Workflow Engine

## Summary

The app exposes serializable workflow state for bounded multi-step tasks instead of relying on implicit retries or model-controlled loops.

## First Implementation Slice

The first concrete workflow is intent clarification:

- `POST /api/intent` starts the workflow
- `POST /api/intent/clarify` continues it when the initial input is ambiguous

## Contract

- Workflow state must be serializable JSON.
- Workflow state must be returned explicitly in app results and HTTP responses.
- `awaiting_clarification` responses must include a `workflowId`.
- `POST /api/intent/clarify` accepts JSON with:
  - `workflowId: string`
  - `clarification: string`
- The first workflow supports these states:
  - `completed`
  - `awaiting_clarification`
- `awaiting_clarification` responses must include:
  - a stable follow-up question
  - a bounded list of allowed intent options

## Runtime Behavior

- Workflow transitions must remain deterministic and testable.
- The model may assist with intent classification, but it must not bypass workflow state rules.
- The clarification continuation must load the original input from stored workflow state before incorporating the follow-up clarification text.
- Unsupported or invalid workflow inputs must fail with stable validation errors rather than partial state mutation.
- Missing workflow state must return the typed `unsupported_workflow_transition` error category rather than a generic route-local failure.
- Workflow repository read or write failures must return the typed `storage_failure` error category rather than escaping the workflow boundary.

## Regression Guardrails

- Workflow state must stay backed by a lightweight in-memory repository in this slice instead of durable storage.
- The no-model path must still support both workflow steps.
- HTTP handlers must remain thin adapters over typed app messages and results.
