# Travel Intelligence Platform — RAG & Reviews Pipeline

This document describes the design and ingestion pipeline for integrating traveler reviews into our Retrieval-Augmented Generation (RAG) knowledge base.

---

## 1. Grounding Itineraries with Real Travel Context

To provide travelers with authentic suggestions, the generation engine will leverage RAG rather than relying solely on the base knowledge of LLMs. This will ground generated plans in real user experiences, local knowledge, seasonal patterns, and hidden gems.

---

## 2. Ingestion & Moderation Pipeline

To keep the system trustworthy, user-submitted reviews do *not* directly feed into the LLM context. They must flow through a validation pipeline:

```text
  [Traveler Review]
          │
          ▼
   [Moderation Queue]   <── Spam checks, automated profanity filters
          │
          ▼
  [Location Validation] <── Resolves entity coordinates using Mapbox API
          │
          ▼
 [Trusted Reviews Store] <── Persisted clean reviews index
          │
          ▼
  [Embedding Service]   <── Converts reviews to vector embeddings
          │
          ▼
   [Vector Database]    <── Indexing (e.g., Pinecone or pgvector)
```

---

## 3. Retrieval & Generation Flow

During itinerary generation:
1. User requests a trip (e.g., "A foodie trip to Kyoto in autumn").
2. Query is converted to vector embeddings.
3. System fetches the top $K$ relevant reviews from the Vector Database.
4. System retrieves seasonal recommendations and local advisories.
5. Injected context:
   ```text
   System instructions: Use the following traveler feedback to design the itinerary:
   - Review 1: "Tofuku-ji temple has the best autumn colors in Kyoto, visit at 8:30 AM to beat crowds."
   - Review 2: "Avoid Gion street photography, respect the local rules."
   ```
6. The LLM generates a highly personalized, grounded itinerary draft.
