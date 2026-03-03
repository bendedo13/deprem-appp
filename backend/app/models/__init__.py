"""
SQLAlchemy ORM modelleri — init_db() çağrısından önce import edilmeli.
Tüm modeller burada import edilerek Alembic autogenerate'in çalışması sağlanır.
"""

from app.models.earthquake import Earthquake  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.emergency_contact import EmergencyContact  # noqa: F401
from app.models.notification_pref import NotificationPref  # noqa: F401
from app.models.seismic_report import SeismicReport  # noqa: F401
from app.models.sos_record import SOSRecord  # noqa: F401