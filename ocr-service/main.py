"""Receipt OCR microservice.

Returns a deterministic mock payload matching the Bar Studna receipt.
The OCR pipeline is bypassed for the workshop demo; the mock is the only response.
"""

import logging
from typing import List

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Receipt OCR Service")

# The Next.js frontend calls this service directly from the browser.
# Permissive CORS is acceptable for a local demo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Item(BaseModel):
    quantity: int
    name: str
    unitPrice: float
    totalPrice: float


class ExtractResponse(BaseModel):
    items: List[Item]
    total: float


# Bar Studna receipt — verified totals: sum of all totalPrice = 1118.00.
MOCK_RESPONSE = ExtractResponse(
    items=[
        Item(quantity=2, name="tequila sunrise", unitPrice=65.0,  totalPrice=130.0),
        Item(quantity=2, name="tequila silver",  unitPrice=22.0,  totalPrice=44.0),
        Item(quantity=5, name="koskenkorva",     unitPrice=45.0,  totalPrice=225.0),
        Item(quantity=3, name="zachranar",       unitPrice=63.0,  totalPrice=189.0),
        Item(quantity=3, name="darth vader",     unitPrice=65.0,  totalPrice=195.0),
        Item(quantity=3, name="cola plech",      unitPrice=35.0,  totalPrice=105.0),
        Item(quantity=2, name="peprmint",        unitPrice=40.0,  totalPrice=80.0),
        Item(quantity=1, name="klobasa",         unitPrice=70.0,  totalPrice=70.0),
        Item(quantity=2, name="orgasmus",        unitPrice=40.0,  totalPrice=80.0),
    ],
    total=1118.0,
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/extract", response_model=ExtractResponse)
async def extract(file: UploadFile = File(...)) -> ExtractResponse:
    await file.read()  # consume the upload to avoid broken-pipe errors on the client
    return MOCK_RESPONSE
