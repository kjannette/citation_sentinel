# Citation Sentinel

A source-grounded research assistant that employs cosine similarity scoring for LLM-generated query responses to provide a "groundedness" score. This is a metric in Retrieval-Augmented Generation (RAG) systems that quantifies how well an AI-generated answer is supported by retrieved context. It measures "faithfulness" to source documents, ensuring the answer is not hallucinated or pulled from the model's pre-training data. 

Users upload source documents, or provide links to online sources including audio/video (i.e. links to youtube videos). Users may then ask questions and receive answers (with inline citations) verifiably grounded in the provided information sources. 

Built with a React/Vite frontend and a Typescript/Node/Express backend, using Anthropic Claude for generation, OpenAI Whisper for video audio track transcription, Voyage AI for embeddings and response cosine similarity scoring (the "groundedness" score).

## Query pipeline

Source Ingestion -> Parsing -> Chunking -> Embedding (using Voyage AI voyage-3 model) -> Storage (vector store) -> { user query submission } -> evaluation of user query -> Retrieval -> Ranking -> Response Generation (Using Anthopic's claude-opus-4-6 model) -> Response Groundedness Scoring (using Voyage AI rerank-r model)

## Prerequisites

- **Node.js** (v18+)
- **yt-dlp** -- required for YouTube video source support (`brew install yt-dlp` or `pip install yt-dlp`)

## Getting Started

```bash
# clone and install
git clone <repo-url> && cd notebooklm_clone
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

1. Retrieval constraint — The query is embedded (also via voyage-3) and compared against stored chunk vectors using cosine similarity, returning the top 20 candidates. Only user-supplied source material is searched; the system has no web search capability.
   
3. Reranking for precision — Those 20 candidates are sent to Voyage AI's rerank-2 cross-encoder, which re-scores each query-chunk pair with deeper semantic analysis. Only the top 5 survive.
   
5. Prompt-level constraint — The top 5 chunks are passed to the Primary LLM (Claude claude-opus-4-6) with an explicit system instruction: "Answer the user's question using ONLY the source documents provided below." The LLM must cite sources using bracketed indices (e.g., [1], [2]) and admit when sources are insufficient.
   
7. Schema enforcement — The LLM's response is constrained to a JSON schema requiring structured fields (answer, citedSourceIndices, followUpQuestions), and any cited source indices that don't correspond to real source groups are programmatically stripped out.
   
9. Post-generation groundedness scoring — After the answer is generated, it is split into individual sentences, each sentence is embedded via voyage-3, and each sentence embedding is compared (cosine similarity) against the vectors of the cited chunks. The raw similarities are calibrated to a 0–1 scale and averaged, producing a single groundedness score that is surfaced to the user as a visual indicator (green/gold/red).

## Design

Two-package monorepo:

- `server/` -- single Express backend with layered architecture (routes -> services -> stores). Routes orchestrate; services contain business logic; stores manage in-memory state.

- `client/` -- React 19 SPA via Vite. Two-panel layout: sidebar for notebooks/data sources, main area for LLM chat with explorable citations, groundedness badges (cosine similarity scoring of LLM responses), and follow-up question chips.

## License

MIT. See [LICENSE](./LICENSE).

## Author

[@sjdev](https://sjdev.co)
