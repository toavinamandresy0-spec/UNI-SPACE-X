<?php
class ExportModel {
    private $conn;
    private $table_name = "exports";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createExport($exportData) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (user_id, export_type, data_type, filters, simulation_id, include_metadata, status, created_at) 
                  VALUES (:user_id, :export_type, :data_type, :filters, :simulation_id, :include_metadata, :status, NOW())";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(":user_id", $exportData['user_id']);
        $stmt->bindParam(":export_type", $exportData['export_type']);
        $stmt->bindParam(":data_type", $exportData['data_type']);
        $stmt->bindParam(":filters", $exportData['filters']);
        $stmt->bindParam(":simulation_id", $exportData['simulation_id']);
        $stmt->bindParam(":include_metadata", $exportData['include_metadata']);
        $stmt->bindParam(":status", $exportData['status']);
        
        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function getExport($exportId, $userId) {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE export_id = :export_id AND user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":export_id", $exportId);
        $stmt->bindParam(":user_id", $userId);
        
        if ($stmt->execute()) {
            $export = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($export && !empty($export['filters'])) {
                $export['filters'] = json_decode($export['filters'], true);
            }
            
            return $export;
        }
        return false;
    }

    public function updateExportStatus($exportId, $status, $errorMessage = null) {
        $query = "UPDATE " . $this->table_name . " 
                  SET status = :status, error_message = :error_message, completed_at = NOW() 
                  WHERE export_id = :export_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":error_message", $errorMessage);
        $stmt->bindParam(":export_id", $exportId);
        
        return $stmt->execute();
    }

    public function updateExportFile($exportId, $filePath, $fileSize) {
        $query = "UPDATE " . $this->table_name . " 
                  SET file_path = :file_path, file_size = :file_size, status = 'completed' 
                  WHERE export_id = :export_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":file_path", $filePath);
        $stmt->bindParam(":file_size", $fileSize);
        $stmt->bindParam(":export_id", $exportId);
        
        return $stmt->execute();
    }

    public function getUserExports($userId, $limit = 20, $offset = 0) {
        $query = "SELECT e.*, s.name as simulation_name 
                  FROM " . $this->table_name . " e
                  LEFT JOIN simulations s ON e.simulation_id = s.simulation_id
                  WHERE e.user_id = :user_id
                  ORDER BY e.created_at DESC
                  LIMIT :limit OFFSET :offset";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            $exports = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($exports as &$export) {
                if (!empty($export['filters'])) {
                    $export['filters'] = json_decode($export['filters'], true);
                }
            }
            
            return $exports;
        }
        return [];
    }

    public function cleanupOldExports($olderThanDays = 30) {
        $query = "SELECT export_id, file_path FROM " . $this->table_name . " 
                  WHERE created_at < DATE_SUB(NOW(), INTERVAL :days DAY)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":days", $olderThanDays, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            $oldExports = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $deletedCount = 0;
            
            foreach ($oldExports as $export) {
                // Supprimer le fichier physique
                if (!empty($export['file_path']) && file_exists(EXPORT_BASE_PATH . $export['file_path'])) {
                    unlink(EXPORT_BASE_PATH . $export['file_path']);
                }
                
                // Supprimer l'enregistrement de la base de données
                $deleteQuery = "DELETE FROM " . $this->table_name . " WHERE export_id = :export_id";
                $deleteStmt = $this->conn->prepare($deleteQuery);
                $deleteStmt->bindParam(":export_id", $export['export_id']);
                
                if ($deleteStmt->execute()) {
                    $deletedCount++;
                }
            }
            
            return $deletedCount;
        }
        
        return 0;
    }

    public function getExportStatistics($userId, $timeRange = '30 days') {
        $query = "SELECT 
                    COUNT(*) as total_exports,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_exports,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_exports,
                    export_type,
                    COUNT(*) as type_count,
                    AVG(file_size) as avg_file_size
                  FROM " . $this->table_name . " 
                  WHERE user_id = :user_id 
                  AND created_at >= DATE_SUB(NOW(), INTERVAL $timeRange)
                  GROUP BY export_type";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        
        if ($stmt->execute()) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }
}
?>