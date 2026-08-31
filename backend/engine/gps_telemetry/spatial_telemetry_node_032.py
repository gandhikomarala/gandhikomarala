"""
Spatial GPS & S2 Cell Telemetry Processor #032
Validates player movement, distance calculation for egg incubation, and anti-spoofing.
"""
import math
from typing import Dict, Any, List

class SpatialTelemetryNode_032:
    def __init__(self, node_id: int = 32):
        self.node_id = node_id
        self.max_speed_kmh = 24.0  # Speed cap for egg hatching

    def calculate_haversine_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """Calculates surface distance in kilometers between two GPS coordinates."""
        r = 6371.0  # Earth radius in KM
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2.0) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    def process_walk_session(self, coords: List[Dict[str, float]]) -> Dict[str, Any]:
        """Calculates distance credited towards Buddy Candies and Egg Hatching."""
        total_dist_km = 0.0
        flagged_points = 0

        for idx in range(1, len(coords)):
            p1 = coords[idx - 1]
            p2 = coords[idx]
            d = self.calculate_haversine_distance(p1["lat"], p1["lon"], p2["lat"], p2["lon"])
            dt_hours = max(0.0001, (p2["timestamp"] - p1["timestamp"]) / 3600.0)
            speed = d / dt_hours

            if speed <= self.max_speed_kmh:
                total_dist_km += d
            else:
                flagged_points += 1

        return {
            "node_id": self.node_id,
            "credited_distance_km": round(total_dist_km, 3),
            "flagged_speed_violations": flagged_points,
            "anti_spoof_verified": flagged_points == 0
        }
