from functools import lru_cache
from urllib.parse import quote_plus, urlsplit

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_CORS_ORIGINS = (
    "https://iare-events-hub.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


def normalize_origin(raw_origin: str) -> str | None:
    origin = raw_origin.strip()
    if not origin:
        return None

    parts = urlsplit(origin)
    if parts.scheme and parts.netloc:
        return f"{parts.scheme}://{parts.netloc}"
    return origin.rstrip("/")


class Settings(BaseSettings):
    database_url: str | None = None
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_db_host: str | None = None
    supabase_db_port: int = 5432
    supabase_db_name: str = "postgres"
    supabase_db_user: str = "postgres"
    supabase_db_password: str | None = None
    supabase_jwt_secret: str | None = None
    app_jwt_secret: str | None = None
    app_jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    samvidha_login_url: str = "https://samvidha.iare.ac.in/pages/login/checkUser.php"
    samvidha_profile_url: str = "https://samvidha.iare.ac.in/home?action=profile"
    samvidha_request_timeout_seconds: int = 15
    allow_dev_auth_headers: bool = False
    jwt_audience: str | None = "authenticated"
    cors_origins: str = (
        "https://iare-events-hub.vercel.app,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @computed_field
    @property
    def async_database_url(self) -> str | None:
        if self.database_url:
            return self.database_url
        if not self.supabase_db_host or not self.supabase_db_password:
            return None
        user = quote_plus(self.supabase_db_user)
        password = quote_plus(self.supabase_db_password)
        return (
            f"postgresql+asyncpg://{user}:{password}@"
            f"{self.supabase_db_host}:{self.supabase_db_port}/{self.supabase_db_name}"
        )

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        origins: list[str] = []
        for raw_origin in (*DEFAULT_CORS_ORIGINS, *self.cors_origins.split(",")):
            origin = normalize_origin(raw_origin)
            if not origin:
                continue
            if origin not in origins:
                origins.append(origin)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
