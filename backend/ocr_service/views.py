from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.http import StreamingHttpResponse
from .ocr_engine import BingoCardExtractor
import traceback
import json

class UploadBingoCardView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            file_bytes = file_obj.read()
            filename = file_obj.name
            is_pdf = filename.lower().endswith('.pdf') or file_bytes.startswith(b'%PDF')

            # Debug: save last upload for analysis
            import os
            debug_path = os.path.join(os.path.dirname(__file__), "last_upload.pdf" if is_pdf else "last_upload.img")
            with open(debug_path, "wb") as f:
                f.write(file_bytes)


            def event_stream():
                """Generator that yields SSE events as cards are processed."""
                try:
                    yield f"data: {json.dumps({'type': 'status', 'message': 'Analizando documento...', 'progress': 5})}\n\n"

                    if is_pdf:
                        # --- Strategy 1: Direct text extraction (fast & accurate) ---
                        yield f"data: {json.dumps({'type': 'status', 'message': 'Extrayendo texto del PDF...', 'progress': 15})}\n\n"

                        cards_data = BingoCardExtractor._extract_from_pdf_text(file_bytes)

                        if cards_data:
                            total = len(cards_data)
                            for i in range(total):
                                pct = 15 + int((i + 1) / total * 80)
                                yield f"data: {json.dumps({'type': 'progress', 'current': i + 1, 'total': total, 'progress': pct, 'message': f'Cartón {i + 1} de {total} extraído'})}\n\n"

                            yield f"data: {json.dumps({'type': 'done', 'progress': 100, 'message': f'¡{total} cartón(es) extraído(s) con éxito!', 'data': cards_data})}\n\n"
                            return

                        # If no text found in PDF, fall through to OCR
                        yield f"data: {json.dumps({'type': 'status', 'message': 'PDF sin texto incrustado. Usando OCR...', 'progress': 20})}\n\n"

                    # --- Strategy 2: OCR fallback (for images or scanned PDFs) ---
                    yield f"data: {json.dumps({'type': 'status', 'message': 'Convirtiendo a imágenes...', 'progress': 10})}\n\n"

                    page_images = BingoCardExtractor.get_page_images(file_bytes, filename)
                    yield f"data: {json.dumps({'type': 'status', 'message': f'Detectando cartones en {len(page_images)} página(s)...', 'progress': 15})}\n\n"

                    all_crops = []
                    for page_img in page_images:
                        crops = BingoCardExtractor._find_cards_on_page(page_img)
                        all_crops.extend(crops)

                    total_cards = len(all_crops)
                    yield f"data: {json.dumps({'type': 'status', 'message': f'Se detectaron {total_cards} cartón(es). Extrayendo números con OCR...', 'progress': 20})}\n\n"

                    cards_data = []
                    for i, crop in enumerate(all_crops):
                        card_data = BingoCardExtractor._extract_card_data_ocr(crop)
                        cards_data.append(card_data)

                        pct = 20 + int((i + 1) / total_cards * 75)
                        yield f"data: {json.dumps({'type': 'progress', 'current': i + 1, 'total': total_cards, 'progress': pct, 'message': f'Procesando cartón {i + 1} de {total_cards}...  (OCR)'})}\n\n"

                    yield f"data: {json.dumps({'type': 'done', 'progress': 100, 'message': '¡Extracción completada!', 'data': cards_data})}\n\n"

                except Exception as e:
                    traceback.print_exc()
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

            response = StreamingHttpResponse(
                event_stream(),
                content_type='text/event-stream'
            )
            response['Cache-Control'] = 'no-cache'
            response['X-Accel-Buffering'] = 'no'
            return response

        except Exception as e:
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
