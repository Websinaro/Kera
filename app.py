import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# =====================================================================
# CONFIGURATION & SECURITY
# =====================================================================
# Secure access key for clients calling your Render API
API_BEARER_TOKEN = os.environ.get("API_BEARER_TOKEN", "websinaro_secret_kera_secure_token_2026")

# Hugging Face Setup
HF_TOKEN = os.environ.get("HF_TOKEN", "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")
REPO_ID = "websinaro/kera-1.5b-instruct"
HF_API_URL = f"https://api-inference.huggingface.co/models/{REPO_ID}"

SYSTEM_PROMPT = (
    "You are Kera, an advanced AI model trained by Adith, the CEO of WEBSINARO. "
    "Maintain a warm tone, use creative emojis, write clean code, and remain direct and concise."
)

# =====================================================================
# SECURITY DECORATOR
# =====================================================================
def require_auth(f):
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or auth_header != f"Bearer {API_BEARER_TOKEN}":
            return jsonify({"error": "Unauthorized. Invalid or missing API key."}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# =====================================================================
# API ENDPOINT
# =====================================================================
@app.route("/api/chat", methods=["POST"])
@require_auth
def chat_endpoint():
    data = request.json or {}
    user_message = data.get("message", "")
    history = data.get("history", [])  # Expects list of {"role": "user/assistant", "content": "..."}

    if not user_message:
        return jsonify({"error": "Missing message parameter"}), 400

    # Build the payload structure matching Hugging Face's expected format
    formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        formatted_messages.append(msg)
    formatted_messages.append({"role": "user", "content": user_message})

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": pipe_format_as_chat_string(formatted_messages) if not hasattr(requests, 'json') else formatted_messages, 
        "parameters": {
            "max_new_tokens": 256,
            "temperature": 0.7,
            "top_p": 0.9,
            "return_full_text": False
        },
        "options": {
            "wait_for_model": True  # Wakes up the model if it's asleep on HF servers
        }
    }

    try:
        response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=30)
        response_json = response.json()

        if response.status_code != 200:
            return jsonify({"error": "Hugging Face API Error", "details": response_json}), response.status_code

        # Extract text response depending on HF returns structure
        bot_response = ""
        if isinstance(response_json, list) and len(response_json) > 0:
            bot_response = response_json[0].get("generated_text", "")
        elif isinstance(response_json, dict):
            bot_response = response_json.get("generated_text", "")

        return jsonify({
            "response": bot_response.strip(),
            "status": "success"
        })

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out waiting for Hugging Face response"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def pipe_format_as_chat_string(messages):
    """Fallback compiler syntax for older inference endpoints parsing raw text inputs"""
    compiled = ""
    for m in messages:
        compiled += f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n"
    compiled += "<|im_start|>assistant\n"
    return compiled

if __name__ == "__main__":
    # Render binds dynamic port assignments via PORT env variable automatically
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
  
