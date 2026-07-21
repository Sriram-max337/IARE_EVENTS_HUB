from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID


metadata = MetaData()

clubs = Table(
    "clubs",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", Text, nullable=False, unique=True),
    Column("code", Text, nullable=False, unique=True),
)

users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("roll_no", Text, nullable=False, unique=True),
    Column("name", Text, nullable=False),
    Column("dept", Text),
    Column("year", Integer, nullable=False),
    Column("role", String, nullable=False, server_default="student"),
    Column("managed_club_id", Integer, ForeignKey("clubs.id")),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    CheckConstraint("year between 1 and 4"),
    CheckConstraint("role in ('student','event_manager','main_admin')"),
)

events = Table(
    "events",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("club_id", Integer, ForeignKey("clubs.id"), nullable=False),
    Column("created_by", Integer, ForeignKey("users.id"), nullable=False),
    Column("title", Text, nullable=False),
    Column("description", Text),
    Column("venue", Text, nullable=False),
    Column("event_date", DateTime(timezone=True), nullable=False),
    Column("capacity", Integer, nullable=False),
    Column("waitlist_enabled", Boolean, nullable=False, server_default="false"),
    Column("status", String, nullable=False, server_default="live"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    CheckConstraint("capacity > 0"),
    CheckConstraint("status in ('live','cancelled')"),
)

registrations = Table(
    "registrations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("event_id", Integer, ForeignKey("events.id"), nullable=False),
    Column("student_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("status", String, nullable=False, server_default="confirmed"),
    Column("student_dept_snapshot", Text),
    Column("student_year_snapshot", Integer, nullable=False),
    Column("qr_token", UUID(as_uuid=True), unique=True, server_default=func.gen_random_uuid()),
    Column("attended", Boolean, nullable=False, server_default="false"),
    Column("checked_in_at", DateTime(timezone=True)),
    Column("registered_at", DateTime(timezone=True), server_default=func.now()),
    UniqueConstraint("event_id", "student_id"),
    CheckConstraint("status in ('confirmed','waitlisted','cancelled')"),
)
