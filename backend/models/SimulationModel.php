<?php
class SimulationModel {
    private $conn;
    private $table_name = "simulations";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getSimulation($simulationId, $userId) {
        $query = "SELECT s.*, u.first_name, u.last_name, u.institution 
                  FROM " . $this->table_name . " s 
                  LEFT JOIN users u ON s.user_id = u.user_id 
                  WHERE s.simulation_id = :simulation_id 
                  AND (s.user_id = :user_id OR s.access_level <= :access_level)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":simulation_id", $simulationId);
        $stmt->bindParam(":user_id", $userId);
        $stmt->bindParam(":access_level", $userId); // Dans une vraie app, on récupérerait le niveau d'accès de l'user
        
        if ($stmt->execute()) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return false;
    }

    public function getSimulations($userId, $accessLevel, $filters = [], $limit = 20, $offset = 0) {
        $query = "SELECT s.*, u.first_name, u.last_name, u.institution 
                  FROM " . $this->table_name . " s 
                  LEFT JOIN users u ON s.user_id = u.user_id 
                  WHERE (s.user_id = :user_id OR s.access_level <= :access_level)";
        
        $params = [
            ':user_id' => $userId,
            ':access_level' => $accessLevel
        ];
        
        // Appliquer les filtres
        if (!empty($filters['type'])) {
            $query .= " AND s.type = :type";
            $params[':type'] = $filters['type'];
        }
        
        if (!empty($filters['status'])) {
            $query .= " AND s.status = :status";
            $params[':status'] = $filters['status'];
        }
        
        if (!empty($filters['search'])) {
            $query .= " AND (s.name LIKE :search OR s.description LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }
        
        if (!empty($filters['start_date'])) {
            $query .= " AND s.created_at >= :start_date";
            $params[':start_date'] = $filters['start_date'];
        }
        
        if (!empty($filters['end_date'])) {
            $query .= " AND s.created_at <= :end_date";
            $params[':end_date'] = $filters['end_date'];
        }
        
        $query .= " ORDER BY s.updated_at DESC LIMIT :limit OFFSET :offset";
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
            $simulations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Décoder les paramètres JSON
            foreach ($simulations as &$simulation) {
                if (!empty($simulation['parameters'])) {
                    $simulation['parameters'] = json_decode($simulation['parameters'], true);
                }
            }
            
            return $simulations;
        }
        return [];
    }

    public function getSimulationsCount($userId, $accessLevel, $filters = []) {
        $query = "SELECT COUNT(*) as total 
                  FROM " . $this->table_name . " s 
                  WHERE (s.user_id = :user_id OR s.access_level <= :access_level)";
        
        $params = [
            ':user_id' => $userId,
            ':access_level' => $accessLevel
        ];
        
        // Appliquer les mêmes filtres
        if (!empty($filters['type'])) {
            $query .= " AND s.type = :type";
            $params[':type'] = $filters['type'];
        }
        
        if (!empty($filters['status'])) {
            $query .= " AND s.status = :status";
            $params[':status'] = $filters['status'];
        }
        
        if (!empty($filters['search'])) {
            $query .= " AND (s.name LIKE :search OR s.description LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }
        
        if (!empty($filters['start_date'])) {
            $query .= " AND s.created_at >= :start_date";
            $params[':start_date'] = $filters['start_date'];
        }
        
        if (!empty($filters['end_date'])) {
            $query .= " AND s.created_at <= :end_date";
            $params[':end_date'] = $filters['end_date'];
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

    public function createSimulation($data) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (user_id, name, type, parameters, description, access_level, status, created_at, updated_at) 
                  VALUES (:user_id, :name, :type, :parameters, :description, :access_level, :status, NOW(), NOW())";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(":user_id", $data['user_id']);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":type", $data['type']);
        $stmt->bindParam(":parameters", $data['parameters']);
        $stmt->bindParam(":description", $data['description']);
        $stmt->bindParam(":access_level", $data['access_level']);
        $stmt->bindParam(":status", $data['status']);
        
        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function updateSimulation($simulationId, $data) {
        $query = "UPDATE " . $this->table_name . " SET ";
        $updates = [];
        $params = [':simulation_id' => $simulationId];
        
        foreach ($data as $key => $value) {
            $updates[] = "$key = :$key";
            $params[":$key"] = $value;
        }
        
        $updates[] = "updated_at = NOW()";
        $query .= implode(", ", $updates) . " WHERE simulation_id = :simulation_id";
        
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }

    public function deleteSimulation($simulationId) {
        // Commencer par supprimer les données associées
        $this->deleteSimulationData($simulationId);
        
        $query = "DELETE FROM " . $this->table_name . " WHERE simulation_id = :simulation_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":simulation_id", $simulationId);
        
        return $stmt->execute();
    }

    private function deleteSimulationData($simulationId) {
        $tables = ['research_data', 'collaboration_sessions', 'exports'];
        
        foreach ($tables as $table) {
            $query = "DELETE FROM $table WHERE simulation_id = :simulation_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":simulation_id", $simulationId);
            $stmt->execute();
        }
    }

    public function updateSimulationStatus($simulationId, $status, $results = null) {
        $query = "UPDATE " . $this->table_name . " 
                  SET status = :status, results = :results, updated_at = NOW() 
                  WHERE simulation_id = :simulation_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":results", $results);
        $stmt->bindParam(":simulation_id", $simulationId);
        
        return $stmt->execute();
    }

    public function getSimulationStatistics($userId, $timeRange = '30 days') {
        $query = "SELECT 
                    COUNT(*) as total_simulations,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_simulations,
                    SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_simulations,
                    AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_duration,
                    type,
                    COUNT(*) as type_count
                  FROM " . $this->table_name . " 
                  WHERE user_id = :user_id 
                  AND created_at >= DATE_SUB(NOW(), INTERVAL $timeRange)
                  GROUP BY type";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        
        if ($stmt->execute()) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }
}
?>