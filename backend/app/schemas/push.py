from pydantic import BaseModel


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_agent: str | None = None


class PushSubscriptionOut(BaseModel):
    id: int
    endpoint: str
    created_at: str

    class Config:
        from_attributes = True
