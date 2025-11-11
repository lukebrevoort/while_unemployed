from fastapi import FastAPI
import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = FastAPI()
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@app.get("/")  # Health Checkpoint
def read_root():
    return {"Healthy": "OK"}


# Handle ai_message event from frontend
@sio.event
async def ai_message(sid, data):
    print(f"Received ai_message from {sid}: {data}")
    # Optionally, emit a response back to the client
    await sio.emit("ai_message_ack", {"status": "received"}, to=sid)


@sio.event
async def connect(sid, environ):
    print("Client connected:", sid)


@sio.event
async def disconnect(sid):
    print("Client disconnected:", sid)


@sio.event
async def my_event(sid, data):
    print("Received data:", data)
    await sio.emit("my_response", {"data": "Received!"}, to=sid)
