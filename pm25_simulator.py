import random
import time
from typing import Tuple, Literal

class PM25Simulator:
    """
    Simulates ambient PM2.5 environmental levels using a smooth mean-reverting
    random walk (Ornstein-Uhlenbeck process).
    
    This is the ONLY simulated sensor in the VitalEdge system, explicitly isolated
    from all physical physiological channels.
    """
    def __init__(self, initial_value: float = 28.5, target_mean: float = 32.0):
        self.current_value = initial_value
        self.target_mean = target_mean
        self.theta = 0.05       # Mean reversion speed
        self.volatility = 0.4   # Step volatility (small, smooth variation)
        self.last_update = time.time()

    def update(self) -> Tuple[float, Literal["GOOD", "MODERATE", "HIGH"]]:
        now = time.time()
        dt = max(0.1, min(2.0, now - self.last_update))
        self.last_update = now

        # Mean reversion drift
        drift = self.theta * (self.target_mean - self.current_value) * dt
        noise = random.gauss(0, self.volatility * (dt ** 0.5))
        
        self.current_value += drift + noise
        # Clamp to realistic physical range [10.0, 110.0]
        self.current_value = max(12.0, min(110.0, self.current_value))
        
        val_rounded = round(self.current_value, 1)

        # Environmental categories based on air quality index standards
        if val_rounded <= 35.0:
            status = "GOOD"
        elif val_rounded <= 55.0:
            status = "MODERATE"
        else:
            status = "HIGH"

        return val_rounded, status

# Global singleton simulator
pm25_sim = PM25Simulator()
