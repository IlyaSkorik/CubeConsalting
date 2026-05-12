from django.shortcuts import render

# Create your views here.
def home(request):
    user_agent = request.META.get("HTTP_USER_AGENT", "").lower()

    is_mobile = any(device in user_agent for device in [
        "iphone",
        "android",
        "mobile"
    ])

    if is_mobile:
        return render(request, "mobile/home.html")

    return render(request, "desktop/home.html")