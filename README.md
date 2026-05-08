# Citation Sentinel

A source-grounded research assistant that employs cosine similarity scoring for LLM generated query responses to provide a "groundedness" score. This is a metric in Retrieval-Augmented Generation (RAG) systems that quantifies how well an AI-generated answer is supported by retrieved context. It measures "faithfulness" to source documents, ensuring the answer is not hallucinated or pulled from the model's pre-training data. 
MIT license, by [@sjdev](https://sjdev.co). 

Users upload source documents, or provide links to online sources including audio/video (i.e. links to youtube videos). Users may then ask questions and receive answers (with inline citations) verifiably grounded in the provided information sources. 

Built with a React/Vite frontend and a Node.js/Express backend, using Anthropic Claude for generation, OpenAI Whisper for video audio track transcription, Voyage AI for embeddings and response cosine similarity scoring (the "groundedness" score).

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

NotebookLM is a powerful research tool, but it is proprietary and closed.
This clone demonstrates the core source-grounded Q&A pattern with transparent
retrieval, generation, and groundedness scoring (LLM response quality cosine scoring) -- all with swappable models/fully open source.

## Design

Two-package monorepo:

- `server/` -- single Express backend with layered architecture
  (routes -> services -> stores). Routes orchestrate; services contain
  business logic; stores manage in-memory state.

- `client/` -- React 19 SPA via Vite. Two-panel layout: sidebar for
  notebooks/data sources, main area for LLM chat with explorable citations, 
  groundedness badges (cosine similarity scoring of LLM responses), and follow-up question chips.

## Query pipeline

Embed query (Voyage) -> k-NN search -> rerank (Voyage) ->
generate answer with citations (Claude) -> compute groundedness score
(cosine similarity of answer vs cited chunks).

## License

MIT. See [LICENSE](./LICENSE).

## Author

[@sjdev](https://sjdev.co)
