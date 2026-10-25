#!/usr/bin/env python3
"""
RazorClone integration example (Python 3.9+, stdlib only).

Connect your app to the gateway exactly like you would to Razorpay:
  1. your backend creates an order (Basic auth with your API keys)
  2. redirect the customer to the hosted checkout
  3. after they pay, verify the signature server-side before fulfilling
  4. capture / refund via the API when needed

Run:
  BASE_URL=https://razorclone.vercel.app \
  KEY_ID=rzp_test_xxx \
  KEY_SECRET=xxx \
  python3 examples/integrate-python.py
"""
import base64
import json
import os
import time
import urllib.error
import urllib.request

BASE_URL = os.environ.get("BASE_URL", "https://razorclone.vercel.app")
KEY_ID = os.environ.get("KEY_ID", "")
KEY_SECRET = os.environ.get("KEY_SECRET", "")

AUTH = "Basic " + base64.b64encode(f"{KEY_ID}:{KEY_SECRET}".encode()).decode()


def api(path, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json", "Authorization": AUTH},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode()}") from e


# 1. Create an order server-side (amount in smallest currency unit: 49900 = Rs 499.00)
order = api(
    "/api/v1/orders",
    method="POST",
    body={
        "amount": 49900,  # Rs 499.00
        "currency": "INR",
        "receipt": f"rcpt_{int(time.time())}",
        "notes": {"order_id": "your-app-order-123", "customer": "rahul@example.com"},
    },
)
print("1. Order created:", order["id"], "| status:", order["status"])

# 2. Send your customer here (open in a browser):
print("2. Checkout URL for your customer:")
print(f"   {BASE_URL}/checkout/{order['id']}")
print("   (test card: 4100 2800 0000 1007, any CVV, future expiry)")

# 3. After the customer pays, fetch the order to see its state.
order_state = api(f"/api/v1/orders/{order['id']}")
print("3. order status after payment:", order_state["status"])

# 4. Verify signature server-side before fulfilling:
#      payload = "{order_id}|{payment_id}"
#      POST /api/v1/utils/verify-signature  -> {"valid": true|false}
print("4. Verify signature server-side before fulfilling (see README).")
print("Done.")
