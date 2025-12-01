#!/usr/bin/env python3

import uvicorn
from fastapi import FastAPI

app = FastAPI(title="Sesame AI Service")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "sesame-ai"}

@app.post("/inference")
def inference(data: dict):
    # Placeholder for Sesame AI inference logic
    # Will be implemented in Phase 5
    return {"response": "Sesame AI placeholder response"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)