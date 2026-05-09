# Citation Sentinel

A source-grounded research assistant that employs cosine similarity scoring for LLM-generated query responses to provide a "groundedness" score. This is a metric in Retrieval-Augmented Generation (RAG) systems that quantifies how well an AI-generated answer is supported by retrieved context. It measures "faithfulness" to source documents, ensuring the answer is not hallucinated or pulled from the model's pre-training data. 

Users upload source documents, or provide links to online sources including audio/video (i.e. links to youtube videos). Users may then ask questions and receive answers (with inline citations) verifiably grounded in the provided information sources. 

Built with a React/Vite frontend and a Typescript/Node/Express backend, using Anthropic Claude for generation, OpenAI Whisper for video audio track transcription, Voyage AI for embeddings and response cosine similarity scoring (the "groundedness" score).

## Query pipeline

Source Ingestion -> Parsing -> Chunking -> Embedding (using Voyage AI voyage-3 model) -> Storage (vector store) -> { user query submission } -> Evaluation of User Query -> Retrieval -> Ranking -> Response Generation (Using Anthopic's claude-opus-4-6 model) -> Response Groundedness Scoring (using Voyage AI rerank-r model)

## Prerequisites

- **Node.js** (v18+)
- **yt-dlp** -- required for YouTube video source support (`brew install yt-dlp`)

## Getting Started

```bash
# clone and install
git clone <repo-url> && cd citation_sentinel
cd server && npm install && cd ..
cd client && npm install && cd ..

# configure
cp server/.env.example server/.env
# edit server/.env and add your ANTHROPIC_API_KEY, VOYAGE_API_KEY,
# and optionally OPENAI_API_KEY (only needed for audio source transcription via Whisper)

# run
make dev
```

## Rationale

This app demonstrates the core source-grounded Q&A pattern with transparent retrieval, generation, and groundedness scoring (LLM response quality cosine scoring) -- all with swappable models and is fully open source.

## Methodology

This application is a RAG (Retrieval-Augmented Generation) system that allows users to upload source documents — PDFs, DOCX files, plain text, audio files, web URLs, and YouTube videos — which are then parsed, split into ~2000-character overlapping chunks, and converted into vector embeddings using Voyage AI's voyage-3 model. Those embeddings are stored in an in-memory vector store.

When a user submits a query, the system enforces groundedness through a multi-layered strategy:

1. **Retrieval constraint** — The query is embedded (via Voyage AI voyage-3) and compared against
   stored chunk vectors using cosine similarity, returning the top 20 candidates.

2. **Reranking for precision** — Those 20 candidates are sent to Voyage AI's rerank-2 cross-encoder,
   which re-scores each query-chunk pair with deeper semantic analysis. Only the top 5 survive.

3. **Prompt-level constraint** — The top 5 chunks are passed to the "Primary LLM" (Claude opus-4-6).
   The LLM must cite sources using bracketed indices (e.g., [1], [2]) and admit when sources are
   insufficient.

4. **Schema enforcement** — The LLM's response is constrained to a JSON schema requiring structured
   fields (answer, citedSourceIndices, followUpQuestions). Any cited source indices that do not
   correspond to real source groups are programmatically stripped out.

5. **Post-generation groundedness scoring** — The answer is split into individual sentences. Voyage
   AI voyage-3 embeds each sentence, and compares it (using cosine similarity) against the vectors
   of the cited chunks. The similarity is calibrated to a 0–1 scale and averaged, producing a single
   groundedness score that is surfaced to the user with a visual indicator (green/yellow/red).

## Design

Two-package monorepo:

- `server/` -- single Express backend with layered architecture (routes -> services -> stores). Routes orchestrate; services contain business logic; stores manage in-memory state.

- `client/` -- React 19 SPA via Vite. Two-panel layout: sidebar for data sources, main area for LLM chat with explorable citations, groundedness badges (cosine similarity scoring of LLM responses), and follow-up question chips.

## License

MIT. See [LICENSE](./LICENSE).

## Author

[@sjdev](https://sjdev.co)
