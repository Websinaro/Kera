import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# =====================================================================
# DYNAMIC HIGH-AVAILABILITY DNS RESOLVER
# =====================================================================
def get_fresh_hf_url():
    """
    Attempts standard domain routing. If Render's DNS drops it,
    queries Cloudflare's secure DNS API to fetch a working live IP.
    """
    domain = "router.huggingface.co"
    default_url = f"https://{domain}/models/websinaro/kera-1.5b-instruct"
    
    try:
        # Check if the local container system can resolve it natively
        response = requests.get(default_url, timeout=2)
        return default_url, {}
    except requests.exceptions.ConnectionError:
        try:
            # Fallback: Query Cloudflare DoH to get the fresh live AWS IP
            doh_url = f"https://cloudflare-dns.com/dns-query?name={domain}&type=A"
            dns_req = requests.get(doh_url, headers={"Accept": "application/dns-json"}, timeout=5)
            dns_data = dns_req.json()
            
            if "Answer" in dns_data and len(dns_data["Answer"]) > 0:
                fresh_ip = dns_data["Answer"][0]["data"]
                # Route via direct IP but pass the critical Host header for SSL/routing
                return f"https://{fresh_ip}/models/websinaro/kera-1.5b-instruct", {"Host": domain}
        except Exception:
            pass
            
    return default_url, {}

# =====================================================================
# CONFIGURATION & SECURITY
# =====================================================================
API_BEARER_TOKEN = os.environ.get("API_BEARER_TOKEN", "websinaro_secret_kera_secure_token_2026")
HF_TOKEN = os.environ.get("HF_TOKEN", "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")
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

    payload = {
        "inputs": f"<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n" + 
                  "".join([f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n" for m in history]) + 
                  f"<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n",
        "parameters": {
            "max_new_tokens": 256,
            "temperature": 0.7,
            "top_p": 0.9
        },
        "options": {
            "wait_for_model": True
        }
    }

    # Fetch dynamic endpoint destination and custom header maps
    target_url, extra_headers = get_fresh_hf_url()

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }
    headers.update(extra_headers)

    try:
        # verify=False bypassed routing verification errors if direct IP maps are utilized
        response = requests.post(target_url, headers=headers, json=payload, timeout=45, verify=False)
        response_json = response.json()

        if response.status_code != 200:
            return jsonify({"error": "Hugging Face API Error", "details": response_json}), response.status_code

        bot_response = ""
        if isinstance(response_json, list) and len(response_json) > 0:
            bot_response = response_json[0].get("generated_text", "")
        elif isinstance(response_json, dict):
            bot_response = response_json.get("generated_text", "")

        return jsonify({
            "response": bot_response.strip(),
            "status": "success"
        })

    except Exception as e:
        return jsonify({"error": f"API routing failure: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
