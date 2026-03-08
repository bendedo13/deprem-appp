# SQLAlchemy ORM modelleri — Alembic autogenerate için tüm modeller import edilmeli
from app.models.earthquake import Earthquake  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.emergency_contact import EmergencyContact  # noqa: F401
from app.models.notification_pref import NotificationPref  # noqa: F401
from app.models.seismic_report import SeismicReport  # noqa: F401
from app.models.sos_record import SOSRecord  # noqa: F401
from app.models.app_settings import AppSettings  # noqa: F401
from app.models.support_ticket import SupportTicket  # noqa: F401
from app.models.community_report import CommunityReport  # noqa: F401
from app.models.health_card import HealthCard  # noqa: F401
