# AImee File & Folder Architecture (Docker + Runpod Edition)

```
aimee-poc/
│
├── mobile/
│   ├── app/
│   │   ├── screens/
│   │   │   ├── MapScreen.tsx
│   │   │   ├── TourScreen.tsx
│   │   │   ├── VoiceScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useGPS.ts
│   │   │   ├── useLiveKitAudio.ts
│   │   │   ├── useBrainSelector.ts
│   │   │   ├── useOfflineLLM.ts
│   │   ├── lib/
│   │   │   ├── livekit.ts
│   │   │   ├── storage.ts
│   │   │   ├── agentEvents.ts
│   │   └── navigation/
│   ├── assets/
│   └── package.json
│
├── docker/
│   ├── docker-compose.yml
│   │
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── livekit-agent/
│   │   │   ├── brains/
│   │   │   ├── agents/
│   │   │   └── rag/
│   │   └── package.json
│   │
│   ├── agent/
│   │   ├── Dockerfile
│   │   └── livekit-agent.ts
│   │
│   ├── sesame/
│   │   ├── Dockerfile
│   │   ├── docker-compose.runpod.yml
│   │   └── server/
│   │       └── main.py
│   │
│   └── rag-db/
│       ├── Dockerfile
│       └── markers.db
│
└── docs/
    ├── architecture.md
    ├── file_structure.md
    ├── roadmap.md
    └── tech_stack.md
```

### Notes
- All backend code is containerized.
- docker-compose controls backend, agent, sesame, db.
- Runpod hosts the sesame container.
- Mobile app remains outside Docker (RN runs on device).
