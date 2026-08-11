from django.urls import path
from .views import UploadBingoCardView

urlpatterns = [
    path('upload/', UploadBingoCardView.as_view(), name='upload_bingo_card'),
]
