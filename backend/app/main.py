from fastapi import FastAPI

from app.api.websocket import router as websocket_router


app = FastAPI(
    title="Indian Railway Wagon Detection API",
    version="1.0.0",
)


app.include_router(websocket_router)


@app.get("/")
def root():
    return {
        "message": "Indian Railway Wagon Detection API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }