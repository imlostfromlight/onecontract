import django
from django.core.handlers.asgi import ASGIHandler
from django_cf.routing import get_cloudflare_handler

# Set the Django settings module
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Setup Django
django.setup()

# Get the standard ASGI application wrapper
application = ASGIHandler()

# Get the Cloudflare Worker handler
# This wraps the ASGI app to handle Cloudflare's FetchEvent
worker_handler = get_cloudflare_handler(application)

# Entry point for Cloudflare Workers
async def fallback_handler(request, env, ctx):
    """
    Called when a request comes from Cloudflare Workers.
    Passes the request into the Django ASGI application.
    """
    return await worker_handler(request, env, ctx)

# For Wrangler/Cloudflare python worker
export = fallback_handler
