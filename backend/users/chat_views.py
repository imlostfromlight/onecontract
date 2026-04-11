"""
AI Chat endpoint using Groq API.
Chat history stored in MongoDB (if MONGODB_URI is set), otherwise in-memory per session.
"""
import uuid
import logging
from datetime import datetime, timezone

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# ── MongoDB connection (lazy) ─────────────────────────────────────────────────

_mongo_collection = None


def get_chat_collection():
    global _mongo_collection
    if _mongo_collection is not None:
        return _mongo_collection

    uri = getattr(settings, 'MONGODB_URI', '')
    if not uri:
        return None

    try:
        from pymongo import MongoClient
        client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        db = client['onecontract']
        _mongo_collection = db['chat_history']
        _mongo_collection.create_index('session_id')
        logger.info("MongoDB connected for chat history")
        return _mongo_collection
    except Exception as e:
        logger.warning(f"MongoDB not available: {e}")
        return None


# ── In-memory fallback ────────────────────────────────────────────────────────

_memory_store: dict[str, list] = {}


def get_history(session_id: str) -> list:
    col = get_chat_collection()
    if col is not None:
        doc = col.find_one({'session_id': session_id})
        return doc['messages'] if doc else []
    return _memory_store.get(session_id, [])


def save_message(session_id: str, role: str, content: str):
    msg = {'role': role, 'content': content, 'ts': datetime.now(timezone.utc).isoformat()}
    col = get_chat_collection()
    if col is not None:
        col.update_one(
            {'session_id': session_id},
            {'$push': {'messages': msg}, '$set': {'updated_at': msg['ts']}},
            upsert=True,
        )
    else:
        _memory_store.setdefault(session_id, []).append(msg)


def clear_history(session_id: str):
    col = get_chat_collection()
    if col is not None:
        col.delete_one({'session_id': session_id})
    else:
        _memory_store.pop(session_id, None)


# ── Groq helper ───────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are OneContract AI — a helpful legal assistant for reviewing and understanding contracts.
You help users understand documents, explain legal terms in plain language, and flag potential risks.
Be concise, friendly, and always respond in the same language the user writes in.
If you don't know something, say so — don't make up legal advice."""


def ask_groq(messages: list[dict]) -> str:
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        return "Groq API key is not configured. Please set GROQ_API_KEY in environment variables."
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{'role': 'system', 'content': SYSTEM_PROMPT}] + messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return f"AI service error: {str(e)}"


# ── Views ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_message(request):
    """
    Send a message to the AI.
    Body: { "message": str, "session_id": str (optional), "document_text": str (optional) }
    Returns: { "reply": str, "session_id": str }
    """
    message = request.data.get('message', '').strip()
    if not message:
        return Response({'error': 'message is required'}, status=400)

    session_id = request.data.get('session_id') or str(uuid.uuid4())
    document_text = request.data.get('document_text', '')

    # Load history
    history = get_history(session_id)
    conversation = [{'role': m['role'], 'content': m['content']} for m in history]

    # Prepend document context if provided and this is the first message
    user_content = message
    if document_text and not history:
        user_content = f"[Document context]\n{document_text[:4000]}\n\n[User question]\n{message}"

    conversation.append({'role': 'user', 'content': user_content})

    # Get AI reply
    reply = ask_groq(conversation)

    # Persist
    save_message(session_id, 'user', message)
    save_message(session_id, 'assistant', reply)

    return Response({'reply': reply, 'session_id': session_id})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    """GET /api/chat/history/?session_id=xxx"""
    session_id = request.query_params.get('session_id', '')
    if not session_id:
        return Response({'messages': []})
    messages = get_history(session_id)
    return Response({'messages': messages, 'session_id': session_id})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def chat_clear(request):
    """DELETE /api/chat/clear/?session_id=xxx"""
    session_id = request.query_params.get('session_id', '')
    if session_id:
        clear_history(session_id)
    return Response({'status': 'cleared'})
