from rest_framework import generics, permissions
from .models import Profile
from .serializers import ProfileSerializer

class ProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    این ویو به کاربر اجازه می‌دهد پروفایل خود را مشاهده کرده یا ویرایش کند.
    فقط کاربری که لاگین کرده است می‌تواند به پروفایل خودش دسترسی داشته باشد.
    """
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # when the user is loged in 
        profile, created = Profile.objects.get_or_create(user=self.request.user)
        return profile