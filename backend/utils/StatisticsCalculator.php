<?php
class StatisticsCalculator {
    
    public static function calculateDescriptiveStats($data) {
        if (empty($data)) {
            return null;
        }
        
        $stats = [
            'count' => count($data),
            'mean' => self::calculateMean($data),
            'median' => self::calculateMedian($data),
            'mode' => self::calculateMode($data),
            'std_dev' => self::calculateStandardDeviation($data),
            'variance' => self::calculateVariance($data),
            'min' => min($data),
            'max' => max($data),
            'range' => max($data) - min($data),
            'quartiles' => self::calculateQuartiles($data)
        ];
        
        return $stats;
    }
    
    public static function calculateMean($data) {
        return array_sum($data) / count($data);
    }
    
    public static function calculateMedian($data) {
        sort($data);
        $count = count($data);
        $middle = floor($count / 2);
        
        if ($count % 2 == 0) {
            return ($data[$middle - 1] + $data[$middle]) / 2;
        } else {
            return $data[$middle];
        }
    }
    
    public static function calculateMode($data) {
        $frequency = array_count_values($data);
        $maxFrequency = max($frequency);
        $modes = array_keys($frequency, $maxFrequency);
        
        return count($modes) === count($data) ? null : $modes;
    }
    
    public static function calculateVariance($data, $sample = true) {
        $mean = self::calculateMean($data);
        $sumSquaredDiffs = 0;
        
        foreach ($data as $value) {
            $sumSquaredDiffs += pow($value - $mean, 2);
        }
        
        return $sample ? $sumSquaredDiffs / (count($data) - 1) : $sumSquaredDiffs / count($data);
    }
    
    public static function calculateStandardDeviation($data, $sample = true) {
        return sqrt(self::calculateVariance($data, $sample));
    }
    
    public static function calculateQuartiles($data) {
        sort($data);
        $count = count($data);
        
        $q1 = self::calculatePercentile($data, 25);
        $q2 = self::calculatePercentile($data, 50);
        $q3 = self::calculatePercentile($data, 75);
        
        return [
            'q1' => $q1,
            'q2' => $q2,
            'q3' => $q3,
            'iqr' => $q3 - $q1
        ];
    }
    
    public static function calculatePercentile($data, $percentile) {
        sort($data);
        $index = ($percentile / 100) * (count($data) - 1);
        
        if (floor($index) == $index) {
            return $data[$index];
        } else {
            $lower = $data[floor($index)];
            $upper = $data[ceil($index)];
            return $lower + ($upper - $lower) * ($index - floor($index));
        }
    }
    
    public static function calculateCorrelation($x, $y) {
        if (count($x) !== count($y) || count($x) < 2) {
            return null;
        }
        
        $n = count($x);
        $sum_x = array_sum($x);
        $sum_y = array_sum($y);
        $sum_xy = 0;
        $sum_x2 = 0;
        $sum_y2 = 0;
        
        for ($i = 0; $i < $n; $i++) {
            $sum_xy += $x[$i] * $y[$i];
            $sum_x2 += $x[$i] * $x[$i];
            $sum_y2 += $y[$i] * $y[$i];
        }
        
        $numerator = $n * $sum_xy - $sum_x * $sum_y;
        $denominator = sqrt(($n * $sum_x2 - $sum_x * $sum_x) * ($n * $sum_y2 - $sum_y * $sum_y));
        
        return $denominator == 0 ? 0 : $numerator / $denominator;
    }
    
    public static function calculateLinearRegression($x, $y) {
        if (count($x) !== count($y) || count($x) < 2) {
            return null;
        }
        
        $n = count($x);
        $sum_x = array_sum($x);
        $sum_y = array_sum($y);
        $sum_xy = 0;
        $sum_x2 = 0;
        
        for ($i = 0; $i < $n; $i++) {
            $sum_xy += $x[$i] * $y[$i];
            $sum_x2 += $x[$i] * $x[$i];
        }
        
        $slope = ($n * $sum_xy - $sum_x * $sum_y) / ($n * $sum_x2 - $sum_x * $sum_x);
        $intercept = ($sum_y - $slope * $sum_x) / $n;
        
        // Calcul du R²
        $y_mean = $sum_y / $n;
        $ss_tot = 0;
        $ss_res = 0;
        
        for ($i = 0; $i < $n; $i++) {
            $ss_tot += pow($y[$i] - $y_mean, 2);
            $y_pred = $slope * $x[$i] + $intercept;
            $ss_res += pow($y[$i] - $y_pred, 2);
        }
        
        $r_squared = $ss_tot == 0 ? 0 : 1 - ($ss_res / $ss_tot);
        
        return [
            'slope' => $slope,
            'intercept' => $intercept,
            'r_squared' => $r_squared,
            'equation' => "y = " . round($slope, 4) . "x + " . round($intercept, 4)
        ];
    }
    
    public static function calculateMovingAverage($data, $window) {
        $result = [];
        $count = count($data);
        
        for ($i = 0; $i <= $count - $window; $i++) {
            $window_data = array_slice($data, $i, $window);
            $result[] = self::calculateMean($window_data);
        }
        
        return $result;
    }
    
    public static function detectOutliers($data, $method = 'iqr') {
        if ($method === 'iqr') {
            $quartiles = self::calculateQuartiles($data);
            $iqr = $quartiles['iqr'];
            $lower_bound = $quartiles['q1'] - 1.5 * $iqr;
            $upper_bound = $quartiles['q3'] + 1.5 * $iqr;
            
            $outliers = [];
            foreach ($data as $index => $value) {
                if ($value < $lower_bound || $value > $upper_bound) {
                    $outliers[] = [
                        'index' => $index,
                        'value' => $value,
                        'reason' => $value < $lower_bound ? 'below_lower_bound' : 'above_upper_bound'
                    ];
                }
            }
            
            return $outliers;
        }
        
        return [];
    }
    
    public static function calculateConfidenceInterval($data, $confidence = 0.95) {
        $mean = self::calculateMean($data);
        $std_dev = self::calculateStandardDeviation($data);
        $n = count($data);
        
        // Score Z pour l'intervalle de confiance
        $z_scores = [
            0.90 => 1.645,
            0.95 => 1.96,
            0.99 => 2.576
        ];
        
        $z = $z_scores[$confidence] ?? 1.96;
        $margin_of_error = $z * ($std_dev / sqrt($n));
        
        return [
            'mean' => $mean,
            'margin_of_error' => $margin_of_error,
            'lower_bound' => $mean - $margin_of_error,
            'upper_bound' => $mean + $margin_of_error,
            'confidence_level' => $confidence
        ];
    }
    
    public static function calculateTrendAnalysis($timeSeries) {
        if (count($timeSeries) < 2) {
            return null;
        }
        
        $timestamps = array_keys($timeSeries);
        $values = array_values($timeSeries);
        
        // Convertir les timestamps en indices numériques
        $start_time = min($timestamps);
        $x = array_map(function($ts) use ($start_time) {
            return (strtotime($ts) - strtotime($start_time)) / 86400; // différence en jours
        }, $timestamps);
        
        $regression = self::calculateLinearRegression($x, $values);
        
        if (!$regression) {
            return null;
        }
        
        // Calcul du taux de changement
        $first_value = $values[0];
        $last_value = end($values);
        $total_change = $last_value - $first_value;
        $percent_change = $first_value != 0 ? ($total_change / $first_value) * 100 : 0;
        
        return [
            'trend' => $regression['slope'] > 0 ? 'increasing' : ($regression['slope'] < 0 ? 'decreasing' : 'stable'),
            'slope' => $regression['slope'],
            'r_squared' => $regression['r_squared'],
            'total_change' => $total_change,
            'percent_change' => $percent_change,
            'equation' => $regression['equation']
        ];
    }
}
?>