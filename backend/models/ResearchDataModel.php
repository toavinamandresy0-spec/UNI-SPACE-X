<?php
class ResearchDataModel {
    private $conn;
    private $table_name = "research_data";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getResearchData($filters = [], $limit = 100, $offset = 0) {
        $query = "SELECT rd.*, s.name as simulation_name, s.type as simulation_type 
                  FROM " . $this->table_name . " rd 
                  LEFT JOIN simulations s ON rd.simulation_id = s.simulation_id 
                  WHERE 1=1";
        
        $params = [];
        
        // Appliquer les filtres
        if (!empty($filters['simulation_id'])) {
            $query .= " AND rd.simulation_id = :simulation_id";
            $params[':simulation_id'] = $filters['simulation_id'];
        }
        
        if (!empty($filters['data_type'])) {
            $query .= " AND rd.data_type = :data_type";
            $params[':data_type'] = $filters['data_type'];
        }
        
        if (!empty($filters['start_date'])) {
            $query .= " AND rd.timestamp >= :start_date";
            $params[':start_date'] = $filters['start_date'];
        }
        
        if (!empty($filters['end_date'])) {
            $query .= " AND rd.timestamp <= :end_date";
            $params[':end_date'] = $filters['end_date'];
        }
        
        if (!empty($filters['user_id'])) {
            $query .= " AND rd.user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }
        
        $query .= " ORDER BY rd.timestamp DESC LIMIT :limit OFFSET :offset";
        $params[':limit'] = $limit;
        $params[':offset'] = $offset;
        
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            if ($key === ':limit' || $key === ':offset') {
                $stmt->bindValue($key, (int)$value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value);
            }
        }
        
        if ($stmt->execute()) {
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Décoder les valeurs de données JSON
            foreach ($data as &$item) {
                if (!empty($item['data_values'])) {
                    $item['data_values'] = json_decode($item['data_values'], true);
                }
            }
            
            return $data;
        }
        return [];
    }

    public function getResearchDataCount($filters = []) {
        $query = "SELECT COUNT(*) as total FROM " . $this->table_name . " WHERE 1=1";
        $params = [];
        
        // Appliquer les mêmes filtres
        if (!empty($filters['simulation_id'])) {
            $query .= " AND simulation_id = :simulation_id";
            $params[':simulation_id'] = $filters['simulation_id'];
        }
        
        if (!empty($filters['data_type'])) {
            $query .= " AND data_type = :data_type";
            $params[':data_type'] = $filters['data_type'];
        }
        
        if (!empty($filters['start_date'])) {
            $query .= " AND timestamp >= :start_date";
            $params[':start_date'] = $filters['start_date'];
        }
        
        if (!empty($filters['end_date'])) {
            $query .= " AND timestamp <= :end_date";
            $params[':end_date'] = $filters['end_date'];
        }
        
        if (!empty($filters['user_id'])) {
            $query .= " AND user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }
        
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        if ($stmt->execute()) {
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['total'];
        }
        return 0;
    }

    public function addResearchData($data) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (simulation_id, data_type, data_values, timestamp, user_id, created_at) 
                  VALUES (:simulation_id, :data_type, :data_values, :timestamp, :user_id, NOW())";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(":simulation_id", $data['simulation_id']);
        $stmt->bindParam(":data_type", $data['data_type']);
        $stmt->bindParam(":data_values", $data['data_values']);
        $stmt->bindParam(":timestamp", $data['timestamp']);
        $stmt->bindParam(":user_id", $data['user_id']);
        
        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function getDataStatistics($simulationId = null) {
        $query = "SELECT 
                    data_type,
                    COUNT(*) as record_count,
                    MIN(timestamp) as first_record,
                    MAX(timestamp) as last_record,
                    AVG(JSON_LENGTH(data_values)) as avg_data_points
                  FROM " . $this->table_name;
        
        $params = [];
        
        if ($simulationId) {
            $query .= " WHERE simulation_id = :simulation_id";
            $params[':simulation_id'] = $simulationId;
        }
        
        $query .= " GROUP BY data_type ORDER BY record_count DESC";
        
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        if ($stmt->execute()) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }

    public function getDataForAnalysis($simulationId, $dataType, $startTime = null, $endTime = null) {
        $query = "SELECT data_id, data_values, timestamp 
                  FROM " . $this->table_name . " 
                  WHERE simulation_id = :simulation_id 
                  AND data_type = :data_type";
        
        $params = [
            ':simulation_id' => $simulationId,
            ':data_type' => $dataType
        ];
        
        if ($startTime) {
            $query .= " AND timestamp >= :start_time";
            $params[':start_time'] = $startTime;
        }
        
        if ($endTime) {
            $query .= " AND timestamp <= :end_time";
            $params[':end_time'] = $endTime;
        }
        
        $query .= " ORDER BY timestamp ASC";
        
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        if ($stmt->execute()) {
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Décoder les valeurs de données JSON
            foreach ($data as &$item) {
                if (!empty($item['data_values'])) {
                    $item['data_values'] = json_decode($item['data_values'], true);
                }
            }
            
            return $data;
        }
        return [];
    }

    public function cleanupOldData($olderThanDays = 365) {
        $query = "DELETE FROM " . $this->table_name . " 
                  WHERE timestamp < DATE_SUB(NOW(), INTERVAL :days DAY) 
                  AND simulation_id NOT IN (
                      SELECT simulation_id FROM simulations WHERE status = 'running'
                  )";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":days", $olderThanDays, PDO::PARAM_INT);
        
        return $stmt->execute();
    }
}
?>