from django.conf import settings

def site(request):
    return {'SITE_URL': settings.EBAGIS_UI_REST_URL}

