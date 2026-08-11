import cv2
import numpy as np
import uuid
import fitz  # PyMuPDF
import base64

# EasyOCR Reader will be lazy-loaded to save memory
_reader = None

def get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(['en'], gpu=False)
    return _reader


class BingoCardExtractor:

    # ==================================================================
    # PUBLIC ENTRY POINT
    # ==================================================================
    @staticmethod
    def get_page_images(image_bytes, filename=""):
        """Convert a document into a list of OpenCV images (for preview)."""
        images = []
        if filename.lower().endswith('.pdf') or image_bytes.startswith(b'%PDF'):
            doc = fitz.open(stream=image_bytes, filetype="pdf")
            for page in doc:
                mat = fitz.Matrix(3, 3)
                pix = page.get_pixmap(matrix=mat)
                arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                if pix.n == 4:
                    images.append(cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR))
                else:
                    images.append(cv2.cvtColor(arr, cv2.COLOR_RGB2BGR))
        else:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                images.append(img)
        if not images:
            raise ValueError("Could not read the file.")
        return images

    @staticmethod
    def process_document(image_bytes, filename=""):
        """Full pipeline: returns list of card dicts."""
        # For PDFs, try TEXT extraction first (100% accurate for digital PDFs)
        if filename.lower().endswith('.pdf') or image_bytes.startswith(b'%PDF'):
            cards = BingoCardExtractor._extract_from_pdf_text(image_bytes)
            if cards:
                return cards

        # Fallback: OCR-based extraction for images or scanned PDFs
        page_images = BingoCardExtractor.get_page_images(image_bytes, filename)
        cards_data = []
        for img in page_images:
            crops = BingoCardExtractor._find_cards_on_page(img)
            for crop in crops:
                data = BingoCardExtractor._extract_card_data_ocr(crop)
                cards_data.append(data)
        return cards_data

    # ==================================================================
    # STRATEGY 1: Direct text extraction from digital PDFs (best accuracy)
    # ==================================================================
    @staticmethod
    def _extract_from_pdf_text(pdf_bytes):
        """
        Extract bingo cards by reading the embedded text in the PDF.
        Optimized for bingo.es format where text looks like:
          B I N G O
          10 30 44 57 67
          6 27 39 46 66
          2 17.es55 75       <-- free space row has '.es' between numbers
          9 20 38 53 64
          15 29 42 52 65
          www.bingo.es
        """
        import re
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        all_cards = []

        for page_idx, page in enumerate(doc):
            raw_text = page.get_text()
            parsed_cards = []  # matrices parsed from text on this page

            # Split text into card chunks using "B" header as delimiter
            # Each card starts with B\nI\nN G O or similar
            # We split on the BINGO header pattern
            card_chunks = re.split(r'B\s*\n\s*I\s*\n\s*N\s*G\s*O', raw_text)

            for chunk in card_chunks:
                chunk = chunk.strip()
                if not chunk:
                    continue

                # Clean up: remove "www.bingo.es" footer
                chunk = re.sub(r'www\.bingo\.es', '', chunk)

                # Handle the ".es" in the free space: "17.es55" -> "17 55"
                chunk = re.sub(r'\.es', ' ', chunk)

                # Extract all numbers from this chunk
                numbers = []
                for token in chunk.split():
                    token = token.strip()
                    if not token:
                        continue
                    # Extract digits only
                    clean = ''.join(filter(str.isdigit, token))
                    if clean:
                        try:
                            num = int(clean)
                            if 1 <= num <= 75:
                                numbers.append(num)
                        except ValueError:
                            pass

                # A valid bingo card has exactly 24 numbers (center is free)
                if len(numbers) < 24:
                    continue

                # Take exactly the first 24 numbers and build the 5x5 matrix
                matrix = []
                idx = 0
                for r in range(5):
                    row = []
                    for c in range(5):
                        if r == 2 and c == 2:
                            row.append("COMODIN")
                        else:
                            if idx < len(numbers):
                                row.append(numbers[idx])
                                idx += 1
                            else:
                                row.append(0)
                    matrix.append(row)

                parsed_cards.append(matrix)

            # Now get individual card images from this page
            page_img = BingoCardExtractor._page_to_cv2(page)
            card_crops = BingoCardExtractor._find_cards_on_page(page_img)

            # Pair each parsed matrix with its corresponding crop image
            for i, matrix in enumerate(parsed_cards):
                if i < len(card_crops):
                    crop = card_crops[i]
                    _, buffer = cv2.imencode('.jpg', crop)
                    img_b64 = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
                else:
                    img_b64 = BingoCardExtractor._render_page_preview(page)

                all_cards.append({
                    "card_id": str(uuid.uuid4()),
                    "serial_number": f"SN-{str(uuid.uuid4())[:8].upper()}",
                    "matrix": matrix,
                    "needs_review": False,
                    "image_base64": img_b64,
                })

        return all_cards

    @staticmethod
    def _page_to_cv2(page):
        """Convert a fitz page to an OpenCV BGR image."""
        mat = fitz.Matrix(3, 3)
        pix = page.get_pixmap(matrix=mat)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
        if pix.n == 4:
            return cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
        return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

    @staticmethod
    def _group_into_cards(detections, page):
        """
        Group number detections into individual bingo cards.
        Each card has 24 numbers (25th is free space).
        Uses spatial clustering to separate cards on the same page.
        """
        if not detections:
            return []

        # Sort detections by Y then X
        sorted_dets = sorted(detections, key=lambda d: (d[1], d[0]))

        # Cluster Y values to find distinct card rows on the page
        y_values = [d[1] for d in sorted_dets]
        y_gaps = []
        for i in range(1, len(y_values)):
            y_gaps.append(y_values[i] - y_values[i - 1])

        # The gap between numbers within a card is small;
        # the gap between cards is large.
        # Use median gap as threshold
        if not y_gaps:
            return []

        median_gap = sorted(y_gaps)[len(y_gaps) // 2]
        card_break_threshold = median_gap * 3  # cards are separated by bigger gaps

        # Split into card groups by large Y gaps
        card_groups = []
        current_group = [sorted_dets[0]]

        for i in range(1, len(sorted_dets)):
            y_diff = sorted_dets[i][1] - sorted_dets[i - 1][1]
            if y_diff > card_break_threshold:
                card_groups.append(current_group)
                current_group = [sorted_dets[i]]
            else:
                current_group.append(sorted_dets[i])
        card_groups.append(current_group)

        # Now within each Y-group, check if there are multiple cards
        # side by side (separated by X gaps)
        result = []
        for group in card_groups:
            x_sorted = sorted(group, key=lambda d: d[0])
            x_gaps = []
            for i in range(1, len(x_sorted)):
                x_gaps.append(x_sorted[i][0] - x_sorted[i - 1][0])

            if not x_gaps:
                # Single number group, skip
                continue

            median_x_gap = sorted(x_gaps)[len(x_gaps) // 2]
            x_break = median_x_gap * 3

            sub_groups = []
            cur = [x_sorted[0]]
            for i in range(1, len(x_sorted)):
                if x_sorted[i][0] - x_sorted[i - 1][0] > x_break:
                    sub_groups.append(cur)
                    cur = [x_sorted[i]]
                else:
                    cur.append(x_sorted[i])
            sub_groups.append(cur)

            for sg in sub_groups:
                if len(sg) >= 20:  # Expect ~24 numbers per card
                    # Calculate bounding box for this card
                    xs = [d[0] for d in sg]
                    ys = [d[1] for d in sg]
                    padding = 20
                    bbox = (
                        min(xs) - padding,
                        min(ys) - padding,
                        max(xs) + padding,
                        max(ys) + padding,
                    )
                    result.append((sg, bbox))

        return result

    @staticmethod
    def _numbers_to_matrix(detections):
        """
        Convert a list of (cx, cy, number) into a 5×5 bingo matrix.
        Uses clustering on coordinates to assign grid positions.
        """
        if len(detections) < 20:
            return None

        # Cluster Y into 5 rows, X into 5 columns
        row_centers = BingoCardExtractor._cluster_1d(
            [d[1] for d in detections], 5
        )
        col_centers = BingoCardExtractor._cluster_1d(
            [d[0] for d in detections], 5
        )
        row_centers = sorted(row_centers)
        col_centers = sorted(col_centers)

        # Assign each detection to grid position
        grid = {}
        for (cx, cy, num) in detections:
            ri = BingoCardExtractor._nearest_idx(cy, row_centers)
            ci = BingoCardExtractor._nearest_idx(cx, col_centers)
            grid[(ri, ci)] = num

        # Build matrix
        matrix = []
        for r in range(5):
            row = []
            for c in range(5):
                if r == 2 and c == 2:
                    row.append("COMODIN")
                else:
                    row.append(grid.get((r, c), 0))
            matrix.append(row)

        return matrix

    @staticmethod
    def _render_card_preview(page, bbox):
        """Render a cropped preview of a card from the PDF page."""
        clip = fitz.Rect(bbox)
        mat = fitz.Matrix(3, 3)
        pix = page.get_pixmap(matrix=mat, clip=clip)

        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
        else:
            img = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

        _, buffer = cv2.imencode('.jpg', img)
        b64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"

    @staticmethod
    def _render_page_preview(page):
        """Render a full page preview from the PDF."""
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
        else:
            img = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode('.jpg', img)
        b64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"

    # ==================================================================
    # STRATEGY 2: OCR-based extraction (fallback for images / scans)
    # ==================================================================
    @staticmethod
    def _find_cards_on_page(img):
        """Detect individual bingo card regions on a page image."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(
            blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )
        contours, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        card_crops = []
        img_area = img.shape[0] * img.shape[1]
        bounding_boxes = sorted(
            [cv2.boundingRect(c) for c in contours],
            key=lambda b: (b[1] // 80, b[0])
        )

        for (x, y, w, h) in bounding_boxes:
            area = w * h
            if area > (img_area * 0.03) and 0.4 < w / float(h) < 2.5:
                card_crops.append(img[y: y + h, x: x + w])

        if not card_crops:
            card_crops.append(img)
        return card_crops

    @staticmethod
    def _extract_card_data_ocr(img):
        """Extract card data using EasyOCR (for image files)."""
        h, w = img.shape[:2]
        min_side = min(h, w)
        if min_side < 400:
            scale = 400 / min_side
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            h, w = img.shape[:2]

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        results = get_reader().readtext(enhanced, allowlist='0123456789')
        if len(results) < 20:
            results2 = get_reader().readtext(enhanced)
            seen = set()
            for r in results:
                cx = int((r[0][0][0] + r[0][2][0]) / 2)
                cy = int((r[0][0][1] + r[0][2][1]) / 2)
                seen.add((cx // 10, cy // 10))
            for r in results2:
                cx = int((r[0][0][0] + r[0][2][0]) / 2)
                cy = int((r[0][0][1] + r[0][2][1]) / 2)
                if (cx // 10, cy // 10) not in seen:
                    results.append(r)

        detections = []
        for (bbox, text, prob) in results:
            clean = ''.join(filter(str.isdigit, text))
            if not clean:
                continue
            try:
                num = int(clean)
            except ValueError:
                continue
            if 1 <= num <= 75:
                cx = (bbox[0][0] + bbox[2][0]) / 2.0
                cy = (bbox[0][1] + bbox[2][1]) / 2.0
                detections.append((cx, cy, num))

        matrix = BingoCardExtractor._numbers_to_matrix(detections)
        if matrix is None:
            matrix = [[0]*5 for _ in range(5)]
            matrix[2][2] = "COMODIN"

        confidence_issues = any(
            cell == 0 for row in matrix for cell in row if cell != "COMODIN"
        )

        _, buffer = cv2.imencode('.jpg', img)
        img_b64 = base64.b64encode(buffer).decode('utf-8')

        return {
            "card_id": str(uuid.uuid4()),
            "serial_number": f"SN-{str(uuid.uuid4())[:8].upper()}",
            "matrix": matrix,
            "needs_review": confidence_issues,
            "image_base64": f"data:image/jpeg;base64,{img_b64}",
        }

    # ==================================================================
    # UTILITIES
    # ==================================================================
    @staticmethod
    def _cluster_1d(values, k):
        """Simple 1-D k-means."""
        if not values:
            return [0] * k
        vals = sorted(values)
        n = len(vals)
        centers = [vals[int(i * n / k)] for i in range(k)]

        for _ in range(20):
            buckets = [[] for _ in range(k)]
            for v in vals:
                idx = BingoCardExtractor._nearest_idx(v, centers)
                buckets[idx].append(v)
            new_c = []
            for i, b in enumerate(buckets):
                new_c.append(sum(b) / len(b) if b else centers[i])
            if new_c == centers:
                break
            centers = new_c
        return centers

    @staticmethod
    def _nearest_idx(value, centers):
        """Return index of nearest centre."""
        best, best_d = 0, abs(value - centers[0])
        for i in range(1, len(centers)):
            d = abs(value - centers[i])
            if d < best_d:
                best_d = d
                best = i
        return best
