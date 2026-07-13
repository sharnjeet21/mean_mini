# Travel Intelligence Platform — AI Engineering & Integration

This document outlines the AI integration architecture, provider abstraction layer, prompt engineering protocols, precision editing, and the future evolution plan of the AI subsystem.

---

## 1. Current AI Architecture

The platform supports a vendor-agnostic AI provider layer designed to delegate requests dynamically:

```text
       [Client Request]
              │
              ▼
   [Express Router /aiRoutes]
              │
              ▼
   [aiProviderResolver.js]
              │
      ┌───────┴───────┐
      ▼               ▼
  [Ollama]        [Gemini]
 (Local/Gemma3) (Cloud/Gemini 2)
```

### 1.1 Providers Supported
1. **Ollama (Default in Dev)**: Runs local models such as `gemma3:latest` over HTTP (`http://localhost:11434`). Enables offline execution and zero inference costs during prototyping.
2. **Google Gemini**: Uses the official Google Gen AI SDK for high-performance, low-latency cloud generation.

---

## 2. Provider Abstraction Layer

The system separates LLM vendors behind a clean interface:
* **Resolver (`server/services/aiProviderResolver.js`)**: Matches `process.env.AI_PROVIDER` to load either `OllamaProvider` or `GeminiProvider`.
* **Interface contract**:
  * `generateItineraryDraft(params)`: Returns a structured JSON containing a Title, Description, Stops array, and Daily Plan.
  * `extractRevisionScope(instruction, plan)`: Identifies day ranges and fields to modify for a revision request.
  * `generateItineraryRevision(instruction, originalPlan, scope)`: Generates updated details for the targeted days.

---

## 3. Itinerary Generation Prompt Engineering

To enforce structured json responses, the prompts require strict output specifications.
* **Input Schema**: Durations, travelers, style, interests, and budget are injected into the context.
* **JSON Constraints**: We instruct the LLM to output *only* valid JSON.
* **Example System Instructions**:
  ```text
  You are an expert travel planner. Return a JSON object matching this schema:
  {
    "title": "Trip Title",
    "description": "Short description",
    "days": [{ "day": 1, "title": "Day theme", "activities": [...] }]
  }
  Do not include markdown wrappers (e.g., ```json) or explanation text.
  ```

---

## 4. Precision Editing & Revision Safeguards

To prevent the AI from arbitrarily rewriting days that the user didn't ask to change, we implement a **Deterministic Merge Pipeline**:

1. **Scope Analyzer**: Express uses the LLM to extract the targeted day index range (e.g., "swap day 2 with museum visits" -> `daysToModify = [2]`).
2. **Context Isolation**: The prompt isolates the editing window, passing only the affected days as `EDITABLE` and other days as `PROTECTED`.
3. **Mongoose Intercept**: The backend merges the generated revised days back into the original Mongoose itinerary document, sequentially renumbering the days and keeping original values for other days untouched.

---

## 5. Future AI Folder Vision (Documentation Only)

To prepare the codebase for high-scale enterprise production, we intend to modularize the `server` directory into a dedicated `server/ai` layout:

```text
server/
└── ai/
    ├── providers/      # Ollama, Gemini, OpenAI, Claude adapters
    ├── prompts/        # System guidelines, templates, and dynamic prompt builders
    ├── schemas/        # Structured output validation models (JSON schema / Zod)
    ├── adapters/       # Input/Output translators to align provider shapes
    ├── cache/          # Semantic query caching to bypass duplicate LLM calls
    ├── rag/            # Retrieval-Augmented Generation context inject files
    ├── embeddings/     # Generation of vector vectors for destination reviews
    ├── evaluation/     # CI pipelines to measure prompt latency and regression
    └── revision/       # Deterministic merges and scope diffing managers
```
