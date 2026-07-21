from datetime import UTC, datetime, time
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, computed_field, field_validator, model_validator


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


class DeptOut(BaseModel):
    id: UUID
    name: str
    code: str


class UserOut(BaseModel):
    id: UUID
    roll_no: str
    name: str
    dept_id: UUID
    year: int
    role: Role
    managed_dept_id: UUID | None = None


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
    date: str | None = None
    time: str | None = None
    dept_id: UUID | None = None

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
    date: str | None = None
    time: str | None = None
    dept_id: UUID | None = None

    @model_validator(mode="after")
    def fill_event_date(self) -> "EventPatch":
        if self.event_date is None and self.date:
            parsed_time = time.fromisoformat(self.time or "00:00")
            self.event_date = datetime.combine(datetime.fromisoformat(self.date).date(), parsed_time, tzinfo=UTC)
        if self.event_date and self.event_date.tzinfo is None:
            self.event_date = self.event_date.replace(tzinfo=UTC)
        return self


class EventOut(BaseModel):
    id: UUID
    dept_id: UUID
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
    created_by: UUID

    @computed_field
    @property
    def manager_id(self) -> UUID:
        return self.created_by


class RegistrationIn(BaseModel):
    event_id: UUID


class RegistrationOut(BaseModel):
    id: UUID
    event_id: UUID
    student_id: UUID
    status: RegistrationStatus
    student_dept_snapshot: UUID
    student_year_snapshot: int
    registered_at: datetime | None = None
    event: EventOut | None = None

    @computed_field
    @property
    def user_id(self) -> UUID:
        return self.student_id


class RegistrationCancelOut(BaseModel):
    registration: RegistrationOut
    promotion_happened: bool
    promoted_registration_id: UUID | None = None


class StatsBucket(BaseModel):
    count: int


class DeptStatsBucket(StatsBucket):
    dept_id: UUID

    @computed_field
    @property
    def deptId(self) -> str:
        return str(self.dept_id)


class YearStatsBucket(StatsBucket):
    year: int


class StatsOut(BaseModel):
    total_confirmed: int
    by_dept: list[DeptStatsBucket]
    by_year: list[YearStatsBucket]

    @computed_field
    @property
    def total(self) -> int:
        return self.total_confirmed

    @computed_field
    @property
    def byDept(self) -> list[dict[str, Any]]:
        return [{"deptId": str(item.dept_id), "count": item.count} for item in self.by_dept]

    @computed_field
    @property
    def byYear(self) -> list[dict[str, Any]]:
        return [{"year": str(item.year), "count": item.count} for item in self.by_year]


class ManagerAssignIn(BaseModel):
    user_id: UUID
    dept_id: UUID


class CurrentUser(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: UUID
    roll_no: str
    name: str
    dept_id: UUID
    year: int
    role: Role
    managed_dept_id: UUID | None = None
    _raw: dict[str, Any] = PrivateAttr(default_factory=dict)

    @classmethod
    def from_row(cls, row: Any) -> "CurrentUser":
        data = dict(row._mapping if hasattr(row, "_mapping") else row)
        user = cls(**data)
        user._raw = data
        return user
