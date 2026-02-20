"""
STA/LTA sismik algoritma yardımcı fonksiyonlar.
Pure fonksiyonlar — test edilebilir, yan etkisiz.
rules.md: type hints zorunlu, max 50 satır/fonksiyon.
"""

from collections import deque
from typing import Deque


def high_pass_filter(sample: float, prev_raw: float, prev_filtered: float, alpha: float) -> float:
    """
    Yüksek geçişli IIR filtre — düşük frekanslı gürültüyü (yürüme) eler.

    Args:
        sample: Mevcut ham ivme değeri.
        prev_raw: Bir önceki ham ivme değeri.
        prev_filtered: Bir önceki filtrelenmiş değer.
        alpha: Filtre katsayısı (0.9 = agresif geçiş).

    Returns:
        Filtrelenmiş ivme değeri.
    """
    return alpha * (prev_filtered + sample - prev_raw)


def compute_sta_lta(
    samples: list[float],
    sta_window: int,
    lta_window: int,
) -> float:
    """
    STA/LTA oranını hesaplar.

    Args:
        samples: Filtrelenmiş ivme örnekleri (en yenisi sonda).
        sta_window: Kısa pencere örnek sayısı.
        lta_window: Uzun pencere örnek sayısı.

    Returns:
        STA/LTA oranı; LTA sıfırsa 0.0 döner.
    """
    if len(samples) < lta_window:
        return 0.0

    sta_samples = samples[-sta_window:]
    lta_samples = samples[-lta_window:]

    sta = sum(abs(s) for s in sta_samples) / sta_window
    lta = sum(abs(s) for s in lta_samples) / lta_window

    return sta / lta if lta > 0 else 0.0


def vector_magnitude(x: float, y: float, z: float) -> float:
    """
    3 eksen ivmeyi tek skaler büyüklüğe çevirir.

    Returns:
        √(x² + y² + z²) değeri.
    """
    return (x ** 2 + y ** 2 + z ** 2) ** 0.5
