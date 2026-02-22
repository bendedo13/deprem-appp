import logging
from datetime import datetime
from fpdf import FPDF
from app.services.risk_calculator import RiskResult

logger = logging.getLogger(__name__)

class RiskReportGenerator:
    """
    Sismik Risk Analizi sonucunu PDF dosyasına dönüştüren servis.
    """

    def generate(self, result: RiskResult, user_email: str) -> bytes:
        """
        PDF oluşturur ve byte verisi olarak döner.
        """
        try:
            pdf = FPDF()
            pdf.add_page()
            
            # Header
            pdf.set_fill_color(224, 7, 0) # Primary Color
            pdf.rect(0, 0, 210, 40, 'F')
            
            pdf.set_font("Helvetica", "B", 24)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(0, 20, "QuakeSense", ln=True, align="C")
            pdf.set_font("Helvetica", "", 12)
            pdf.cell(0, 10, "Sismik Risk Analiz Raporu", ln=True, align="C")
            
            pdf.ln(20)
            
            # User & Date info
            pdf.set_text_color(0, 0, 0)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(40, 10, "Kullanici:", 0)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 10, user_email, 1)
            
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(40, 10, "Rapor Tarihi:", 0)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 10, datetime.now().strftime("%d.%m.%Y %H:%M"), 1)
            
            pdf.ln(20)
            
            # Risk Score Section
            pdf.set_font("Helvetica", "B", 16)
            pdf.cell(0, 10, f"Risk Skoru: {result.score} / 10", ln=True)
            
            # Level Badge
            level_color = (0, 185, 129) # Düşük (Green)
            if result.level == "Çok Yüksek":
                level_color = (224, 7, 0)
            elif result.level == "Yüksek":
                level_color = (249, 115, 22)
            elif result.level == "Orta":
                level_color = (245, 158, 11)
                
            pdf.set_fill_color(*level_color)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(60, 12, f"SEVIYE: {result.level.upper()}", 0, 1, 'C', True)
            
            pdf.ln(10)
            pdf.set_text_color(0, 0, 0)
            
            # Details Table
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(100, 10, "Parametre", 1)
            pdf.cell(90, 10, "Deger", 1, 1)
            
            pdf.set_font("Helvetica", "", 10)
            data = [
                ("En Yakin Fay Hattı", result.nearest_fault),
                ("Fay Hattina Mesafe", f"{result.fault_distance_km} km"),
                ("Zemin Sinifi", result.soil_class),
                ("Bina Yapim Yili", str(result.building_year)),
            ]
            
            for key, val in data:
                pdf.cell(100, 10, key, 1)
                pdf.cell(90, 10, val, 1, 1)
                
            pdf.ln(15)
            
            # Factors
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 10, "Risk Faktorleri (Agirlikli)", ln=True)
            pdf.set_font("Helvetica", "", 10)
            for factor, val in result.factors.items():
                pdf.cell(0, 8, f"- {factor.replace('_', ' ').title()}: {val}", ln=True)
                
            pdf.ln(10)
            
            # Recommendations
            pdf.set_fill_color(240, 240, 240)
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 10, "Uzman Onerileri", ln=True, fill=True)
            pdf.set_font("Helvetica", "", 10)
            for rec in result.recommendations:
                # ASCII conversion because FPDF default fonts don't support all UTF-8 chars without extra setup
                # In real project we would add a Unicode font (e.g. DejaVuSans)
                clean_rec = rec.replace("ı", "i").replace("ü", "u").replace("ö", "o").replace("ş", "s").replace("ğ", "g").replace("ç", "c")
                clean_rec = clean_rec.replace("İ", "I").replace("Ü", "U").replace("Ö", "O").replace("Ş", "S").replace("Ğ", "G").replace("Ç", "C")
                pdf.multi_cell(0, 10, f"* {clean_rec}", border=0)
            
            # Footer
            pdf.set_y(-30)
            pdf.set_font("Helvetica", "I", 8)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 10, "Bu rapor QuakeSense sitemi tarafindan otomatik uretilmistir. Resmi nitelik tasimaz.", align="C")
            
            return pdf.output()
            
        except Exception as e:
            logger.error(f"PDF generation failed: {str(e)}")
            raise
