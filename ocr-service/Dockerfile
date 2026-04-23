FROM python:3.12-slim

# pytesseract is only a Python wrapper — the actual OCR engine binary must be
# installed at the OS level. Without this apt package, every call would fail
# and we would fall through to the mock response on every request.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
