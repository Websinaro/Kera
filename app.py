import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# =====================================================================
# CONFIGURATION & SECURITY
# =====================================================================
API_BEARER_TOKEN = os.environ.get("API_BEARER_TOKEN", "websinaro_secret_kera_secure_token_2026")
HF_TOKEN = os.environ.get("HF_TOKEN", "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")

# FIXED: Added the required router suffix ':auto' so the backend can map the model provider smoothly
REPO_ID = "websinaro/kera-1.5b-instruct:auto"
HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are Kera, an advanced AI model trained by Adith, the CEO of WEBSINARO. "
    "Maintain a warm tone, use creative emojis, write clean code, and remain direct and concise."
)

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
    history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Missing message parameter"}), 400

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        messages.append(msg)
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": REPO_ID,
        "messages": messages,
        "max_tokens": 256,
        "temperature": 0.7,
        "top_p": 0.9,
        "stream": False
    }

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(HF_ROUTER_URL, headers=headers, json=payload, timeout=45)
        
        try:
            response_json = response.json()
        except ValueError:
            return jsonify({
                "error": "Non-JSON response received from Hugging Face Router",
                "status_code": response.status_code,
                "raw_response": response.text[:200]
            }), 500

        if response.status_code != 200:
            return jsonify({"error": "Hugging Face Router Error", "details": response_json}), response.status_code

        bot_response = ""
        if "choices" in response_json and len(response_json["choices"]) > 0:
            bot_response = response_json["choices"][0]["message"]["content"]

        return jsonify({
            "response": bot_response.strip(),
            "status": "success"
        })

    except Exception as e:
        return jsonify({"error": f"API transmission failure: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
