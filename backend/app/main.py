from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.websocket import router as websocket_router
from app.api.wagon import router as wagon_router


app = FastAPI(
    title="Indian Railway Wagon Detection API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    wagon_router
)

app.include_router(
    websocket_router
)


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