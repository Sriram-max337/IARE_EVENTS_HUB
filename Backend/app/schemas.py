from datetime import UTC, datetime, time
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, computed_field, model_validator


class Role(StrEnum):
    student = "student"
    event_manager = "event_manager"
    main_admin = "main_admin"


class EventStatus(StrEnum):
    live = "live"
    cancelled = "cancelled"


class RegistrationStatus(StrEnum):
    confirmed = "confirmed"
    waitlisted = "waitlisted"
    cancelled = "cancelled"


class ErrorMessage(BaseModel):
    message: str


class ClubOut(BaseModel):
    id: int
    name: str
    code: str


class UserOut(BaseModel):
    id: int
    roll_no: str
    name: str
    dept: str | None = None
    year: int
    role: Role
    managed_club_id: int | None = None


class SamvidhaProfileOut(BaseModel):
    name: str
    roll_no: str
    branch: str
    year: int
    section: str | None = None


class LoginIn(BaseModel):
    roll_no: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    profile: SamvidhaProfileOut


class EventIn(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    venue: str = Field(min_length=1)
    event_date: datetime | None = None
    capacity: int = Field(gt=0)
    waitlist_enabled: bool = False
    club_id: int | None = None
    date: str | None = None
    time: str | None = None

    @model_validator(mode="after")
    def fill_event_date(self) -> "EventIn":
        if self.event_date is None:
            if not self.date:
                raise ValueError("event_date is required")
            parsed_time = time.fromisoformat(self.time or "00:00")
            self.event_date = datetime.combine(datetime.fromisoformat(self.date).date(), parsed_time, tzinfo=UTC)
        if self.event_date.tzinfo is None:
            self.event_date = self.event_date.replace(tzinfo=UTC)
        if self.event_date <= datetime.now(UTC):
            raise ValueError("event_date cannot be in the past")
        return self


class EventPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None
    venue: str | None = Field(default=None, min_length=1)
    event_date: datetime | None = None
    capacity: int | None = Field(default=None, gt=0)
    waitlist_enabled: bool | None = None
    status: EventStatus | None = None
    club_id: int | None = None
    date: str | None = None
    time: str | None = None

    @model_validator(mode="after")
    def fill_event_date(self) -> "EventPatch":
        if self.event_date is None and self.date:
            parsed_time = time.fromisoformat(self.time or "00:00")
            self.event_date = datetime.combine(datetime.fromisoformat(self.date).date(), parsed_time, tzinfo=UTC)
        if self.event_date and self.event_date.tzinfo is None:
            self.event_date = self.event_date.replace(tzinfo=UTC)
        if self.event_date and self.event_date <= datetime.now(UTC):
            raise ValueError("event_date cannot be in the past")
        return self


class EventOut(BaseModel):
    id: int
    club_id: int
    title: str
    description: str | None = None
    venue: str
    event_date: datetime
    capacity: int
    waitlist_enabled: bool
    status: EventStatus
    created_at: datetime | None = None

    @computed_field
    @property
    def date(self) -> str:
        return self.event_date.date().isoformat()

    @computed_field
    @property
    def time(self) -> str:
        return self.event_date.strftime("%H:%M")


class EventManagerOut(EventOut):
    created_by: int


class RegistrationIn(BaseModel):
    event_id: int


class RegistrationOut(BaseModel):
    id: int
    event_id: int
    student_id: int
    status: RegistrationStatus
    student_dept_snapshot: str | None = None
    student_year_snapshot: int
    qr_token: UUID | None = None
    attended: bool = False
    checked_in_at: datetime | None = None
    registered_at: datetime | None = None
    event: EventOut | None = None

    @computed_field
    @property
    def user_id(self) -> int:
        return self.student_id


class RegistrationCancelOut(BaseModel):
    registration: RegistrationOut
    promotion_happened: bool
    promoted_registration_id: int | None = None


class EventCapacityOut(BaseModel):
    event_id: int
    confirmed_count: int
    waitlisted_count: int
    active_count: int


class CheckInIn(BaseModel):
    qr_token: str = Field(min_length=1)


class CheckInOut(BaseModel):
    student_name: str
    roll_no: str
    checked_in_at: datetime


class AttendanceRowOut(BaseModel):
    student_name: str
    roll_no: str
    dept: str | None = None
    attended: bool
    checked_in_at: datetime | None = None


class StatsBucket(BaseModel):
    count: int


class DeptStatsBucket(StatsBucket):
    dept: str | None = None


class YearStatsBucket(StatsBucket):
    year: int


class StatsOut(BaseModel):
    total_confirmed: int
    total_waitlisted: int
    dept_breakdown: list[DeptStatsBucket]
    year_breakdown: list[YearStatsBucket]
    total_attended: int
    attendance_rate: float

    @computed_field
    @property
    def total(self) -> int:
        return self.total_confirmed

    @computed_field
    @property
    def by_dept(self) -> list[DeptStatsBucket]:
        return self.dept_breakdown

    @computed_field
    @property
    def by_year(self) -> list[YearStatsBucket]:
        return self.year_breakdown


class ManagerAssignIn(BaseModel):
    user_id: int
    club_id: int


class CurrentUser(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: int
    roll_no: str
    name: str
    dept: str | None = None
    year: int
    role: Role
    managed_club_id: int | None = None
    _raw: dict[str, Any] = PrivateAttr(default_factory=dict)

    @classmethod
    def from_row(cls, row: Any) -> "CurrentUser":
        data = dict(row._mapping if hasattr(row, "_mapping") else row)
        user = cls(**data)
        user._raw = data
        return user
