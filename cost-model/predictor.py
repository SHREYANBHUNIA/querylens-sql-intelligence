from __future__ import annotations

from typing import Iterable

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor


class CostPredictor:
    """Small deterministic model that calibrates rule-derived planner costs."""

    def __init__(self) -> None:
        self.model_name = "Scikit-learn Gradient Boosting"
        self.model = self._build_model()

    def _build_model(self):
        x = np.array([[1,0,0,0,0],[1,0,1,0,0],[1,1,1,0,0],[2,1,1,0,0],[2,2,1,1,0],[3,2,1,1,0],[3,3,1,1,1],[4,4,1,1,1],[5,4,0,1,1]])
        y = np.array([42,64,104,188,361,510,795,1210,1640])
        try:
            from xgboost import XGBRegressor

            self.model_name = "XGBoost regressor"
            model = XGBRegressor(n_estimators=48, max_depth=2, learning_rate=0.12, objective="reg:squarederror", n_jobs=1, random_state=42, verbosity=0)
        except Exception:
            model = GradientBoostingRegressor(random_state=42, n_estimators=50, max_depth=2)
        model.fit(x, y)
        return model

    def predict(self, features: Iterable[float]) -> float:
        return float(self.model.predict(np.array([list(features)]))[0])
