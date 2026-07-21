from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup

from app.config import get_settings


class SamvidhaAuthError(Exception):
    pass


class SamvidhaPortalError(Exception):
    pass


@dataclass(frozen=True)
class SamvidhaProfile:
    name: str
    roll_no: str
    branch: str
    year: int
    section: str | None = None


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)


class SamvidhaClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.login_url = settings.samvidha_login_url
        self.profile_url = settings.samvidha_profile_url
        self.timeout = settings.samvidha_request_timeout_seconds

    def authenticate(self, roll_no: str, password: str) -> SamvidhaProfile:
        try:
            with requests.Session() as session:
                session.headers.update(
                    {
                        "User-Agent": USER_AGENT,
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    }
                )
                login_response = session.post(
                    self.login_url,
                    data={"username": roll_no, "password": password},
                    timeout=self.timeout,
                )
                if login_response.status_code >= 400:
                    raise SamvidhaAuthError("invalid credentials")

                profile_response = session.get(self.profile_url, timeout=self.timeout)
                if profile_response.status_code in {401, 403}:
                    raise SamvidhaAuthError("invalid credentials")
                if profile_response.status_code >= 400:
                    raise SamvidhaPortalError("could not fetch profile")

                profile = self._parse_profile(profile_response.text)
                if profile.roll_no.lower() != roll_no.lower():
                    raise SamvidhaAuthError("invalid credentials")
                return profile
        except requests.RequestException as exc:
            raise SamvidhaPortalError("samvidha portal unavailable") from exc

    def _parse_profile(self, html: str) -> SamvidhaProfile:
        soup = BeautifulSoup(html, "html.parser")
        profile_data = {"name": None, "roll_no": None, "branch": None, "year": None, "section": None}
        for dt in soup.find_all("dt"):
            label = dt.get_text(strip=True)
            dd = dt.find_next_sibling("dd")
            if not dd:
                continue
            value = dd.get_text(strip=True)

            if label == "Name":
                profile_data["name"] = value
            elif label == "Roll Number":
                profile_data["roll_no"] = value
            elif label == "Branch":
                profile_data["branch"] = value
            elif label == "Section":
                profile_data["section"] = value
            elif label == "Year/Sem":
                profile_data["year"] = value.split()[0] if value else None

        missing = [key for key in ("name", "roll_no", "branch", "year") if not profile_data[key]]
        if missing:
            raise SamvidhaPortalError("profile details not found")

        try:
            year = _parse_year(str(profile_data["year"]))
        except ValueError as exc:
            raise SamvidhaPortalError("profile year is invalid") from exc

        return SamvidhaProfile(
            name=str(profile_data["name"]),
            roll_no=str(profile_data["roll_no"]),
            branch=str(profile_data["branch"]),
            year=year,
            section=str(profile_data["section"]) if profile_data["section"] else None,
        )


def _parse_year(value: str) -> int:
    token = value.strip().split()[0].upper().rstrip(".,")
    roman_years = {"I": 1, "II": 2, "III": 3, "IV": 4}
    if token in roman_years:
        return roman_years[token]
    digits = "".join(char for char in token if char.isdigit())
    if not digits:
        raise ValueError("missing year")
    year = int(digits)
    if year < 1 or year > 4:
        raise ValueError("year out of range")
    return year
