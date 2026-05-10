from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class BearerTokenAuthentication(TokenAuthentication):
    """Accepts both 'Token <key>' and 'Bearer <key>' authorization headers."""

    def authenticate(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        if not auth or auth[0].lower() not in ('token', 'bearer'):
            return None
        if len(auth) != 2:
            raise AuthenticationFailed('Invalid token header.')
        return self.authenticate_credentials(auth[1])
