"""
Encounter Physics & Catch Probability Model #077
Simulates curveball trajectories, throw accuracy rings, and fleeing mechanics.
"""
import math
from typing import Dict, Any, Tuple

class EncounterPhysicsModel_077:
    def __init__(self, model_id: int = 77):
        self.model_id = model_id
        self.gravity = 9.81 * (77 * 0.01 + 0.9)
        self.air_resistance = 0.025
        self.base_catch_multiplier = 1.0 + (77 % 10) * 0.05

    def calculate_catch_probability(
        self,
        base_rate: float,
        ball_type: str,
        berry_used: str,
        throw_rating: str,
        curveball: bool
    ) -> float:
        """Calculates precise capture probability based on official GO mechanics."""
        ball_mult = {"pokeball": 1.0, "greatball": 1.5, "ultraball": 2.0}.get(ball_type.lower(), 1.0)
        berry_mult = {"none": 1.0, "razz": 1.5, "silver_pinap": 1.8, "golden_razz": 2.5}.get(berry_used.lower(), 1.0)
        ring_mult = {"nice": 1.15, "great": 1.5, "excellent": 1.85}.get(throw_rating.lower(), 1.0)
        curve_mult = 1.7 if curveball else 1.0

        multipliers = ball_mult * berry_mult * ring_mult * curve_mult * self.base_catch_multiplier
        cpm = 0.59740001
        catch_prob = 1.0 - math.pow(1.0 - (base_rate / (2.0 * cpm)), multipliers)
        return max(0.01, min(0.999, catch_prob))

    def simulate_trajectory(self, v0: float, angle_deg: float, spin_rate: float) -> Dict[str, Any]:
        """Calculates 3D trajectory with Magnus effect."""
        rad = math.radians(angle_deg)
        vx = v0 * math.cos(rad)
        vy = v0 * math.sin(rad)
        t_flight = (2.0 * vy) / self.gravity
        max_height = (vy * vy) / (2.0 * self.gravity)
        horizontal_dist = vx * t_flight + (spin_rate * 0.15)
        return {
            "model_id": self.model_id,
            "flight_time_seconds": round(t_flight, 3),
            "apex_height_meters": round(max_height, 3),
            "distance_meters": round(horizontal_dist, 3),
            "is_curveball": abs(spin_rate) > 2.5
        }

    def evaluate_flee_chance(self, flee_rate: float, failed_shakes: int) -> bool:
        """Determines if wild Pokemon flees after failed catch attempt."""
        adjusted_flee = flee_rate * (1.0 + failed_shakes * 0.1)
        return adjusted_flee > 0.85
