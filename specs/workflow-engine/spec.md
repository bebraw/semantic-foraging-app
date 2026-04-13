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
- The first workflow supports these states:
  - `completed`
  - `awaiting_clarification`
- `awaiting_clarification` responses must include:
  - a stable follow-up question
  - a bounded list of allowed intent options

## Runtime Behavior

- Workflow transitions must remain deterministic and testable.
- The model may assist with intent classification, but it must not bypass workflow state rules.
- The clarification continuation must preserve the original input while incorporating the follow-up clarification text.
- Unsupported or invalid workflow inputs must fail with stable validation errors rather than partial state mutation.

## Regression Guardrails

- Workflow state must stay independent of durable storage in this slice.
- The no-model path must still support both workflow steps.
- HTTP handlers must remain thin adapters over typed app messages and results.
