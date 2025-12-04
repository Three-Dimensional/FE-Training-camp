from pydantic import BaseModel


class QuoteResponse(BaseModel):
    code: str
    name: str
    price: float
    change_percent: float
    change_amount: float
    open: float
    high: float
    low: float
    prev_close: float
    time: str


class LimitStatusResponse(BaseModel):
    code: str
    name: str
    price: float
    limit_up_price: float
    limit_down_price: float
    is_limit_up: bool
    is_limit_down: bool
    limit_rate: float


class ErrorResponse(BaseModel):
    error: str

