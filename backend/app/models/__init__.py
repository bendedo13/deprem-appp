# SQLAlchemy ORM modelleri — init_db() çağrısından önce import edilmeli
from app.models.earthquake import Earthquake  # noqa: F401
from app.models.user import User  # noqa: F401
