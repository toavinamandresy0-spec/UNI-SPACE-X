<?php
class CollaborationModel {
    private $conn;
    private $table_sessions = "collaboration_sessions";
    private $table_participants = "session_participants";
    private $table_messages = "session_messages";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getCollaborationSessions($userId) {
        $query = "SELECT cs.*, u.first_name as creator_first_name, u.last_name as creator_last_name,
                         COUNT(sp.user_id) as participant_count
                  FROM " . $this->table_sessions . " cs
                  LEFT JOIN users u ON cs.created_by = u.user_id
                  LEFT JOIN " . $this->table_participants . " sp ON cs.session_id = sp.session_id
                  WHERE cs.session_id IN (
                      SELECT session_id FROM " . $this->table_participants . " WHERE user_id = :user_id
                  )
                  GROUP BY cs.session_id
                  ORDER BY cs.last_activity DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        
        if ($stmt->execute()) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }

    public function getSession($sessionId) {
        $query = "SELECT cs.*, u.first_name as creator_first_name, u.last_name as creator_last_name
                  FROM " . $this->table_sessions . " cs
                  LEFT JOIN users u ON cs.created_by = u.user_id
                  WHERE cs.session_id = :session_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        
        if ($stmt->execute()) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return false;
    }

    public function getSessionParticipants($sessionId, $userId) {
        // Vérifier que l'utilisateur a accès à cette session
        if (!$this->isUserInSession($sessionId, $userId)) {
            return [];
        }
        
        $query = "SELECT sp.*, u.first_name, u.last_name, u.email, u.institution, u.research_domain
                  FROM " . $this->table_participants . " sp
                  LEFT JOIN users u ON sp.user_id = u.user_id
                  WHERE sp.session_id = :session_id
                  ORDER BY sp.joined_at ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        
        if ($stmt->execute()) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }

    public function createCollaborationSession($sessionData) {
        // Commencer une transaction
        $this->conn->beginTransaction();
        
        try {
            // Créer la session
            $query = "INSERT INTO " . $this->table_sessions . " 
                      (name, simulation_id, description, created_by, access_code, created_at, last_activity) 
                      VALUES (:name, :simulation_id, :description, :created_by, :access_code, NOW(), NOW())";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":name", $sessionData['name']);
            $stmt->bindParam(":simulation_id", $sessionData['simulation_id']);
            $stmt->bindParam(":description", $sessionData['description']);
            $stmt->bindParam(":created_by", $sessionData['created_by']);
            $stmt->bindParam(":access_code", $sessionData['access_code']);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to create session");
            }
            
            $sessionId = $this->conn->lastInsertId();
            
            // Ajouter le créateur comme participant
            $this->addParticipant($sessionId, $sessionData['created_by'], 'creator');
            
            // Commit de la transaction
            $this->conn->commit();
            
            return $sessionId;
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Create session error: " . $e->getMessage());
            return false;
        }
    }

    public function joinCollaborationSession($accessCode, $userId) {
        // Trouver la session par code d'accès
        $query = "SELECT session_id FROM " . $this->table_sessions . " 
                  WHERE access_code = :access_code AND is_active = 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":access_code", $accessCode);
        
        if ($stmt->execute() && $session = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $sessionId = $session['session_id'];
            
            // Vérifier si l'utilisateur est déjà dans la session
            if ($this->isUserInSession($sessionId, $userId)) {
                return $sessionId;
            }
            
            // Ajouter l'utilisateur comme participant
            if ($this->addParticipant($sessionId, $userId, 'participant')) {
                // Mettre à jour la dernière activité
                $this->updateSessionActivity($sessionId);
                return $sessionId;
            }
        }
        
        return false;
    }

    private function addParticipant($sessionId, $userId, $role) {
        $query = "INSERT INTO " . $this->table_participants . " 
                  (session_id, user_id, role, joined_at, last_active) 
                  VALUES (:session_id, :user_id, :role, NOW(), NOW()) 
                  ON DUPLICATE KEY UPDATE last_active = NOW()";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        $stmt->bindParam(":user_id", $userId);
        $stmt->bindParam(":role", $role);
        
        return $stmt->execute();
    }

    private function isUserInSession($sessionId, $userId) {
        $query = "SELECT 1 FROM " . $this->table_participants . " 
                  WHERE session_id = :session_id AND user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        $stmt->bindParam(":user_id", $userId);
        
        return $stmt->execute() && $stmt->fetch();
    }

    public function getSessionMessages($sessionId, $userId, $limit = 50, $offset = 0) {
        // Vérifier l'accès
        if (!$this->isUserInSession($sessionId, $userId)) {
            return [];
        }
        
        $query = "SELECT sm.*, u.first_name, u.last_name 
                  FROM " . $this->table_messages . " sm
                  LEFT JOIN users u ON sm.user_id = u.user_id
                  WHERE sm.session_id = :session_id
                  ORDER BY sm.created_at DESC
                  LIMIT :limit OFFSET :offset";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Décoder les métadonnées JSON
            foreach ($messages as &$message) {
                if (!empty($message['metadata'])) {
                    $message['metadata'] = json_decode($message['metadata'], true);
                }
            }
            
            return $messages;
        }
        return [];
    }

    public function addMessage($messageData) {
        // Vérifier que l'utilisateur est dans la session
        if (!$this->isUserInSession($messageData['session_id'], $messageData['user_id'])) {
            return false;
        }
        
        $query = "INSERT INTO " . $this->table_messages . " 
                  (session_id, user_id, message, message_type, metadata, created_at) 
                  VALUES (:session_id, :user_id, :message, :message_type, :metadata, NOW())";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $messageData['session_id']);
        $stmt->bindParam(":user_id", $messageData['user_id']);
        $stmt->bindParam(":message", $messageData['message']);
        $stmt->bindParam(":message_type", $messageData['message_type']);
        $stmt->bindParam(":metadata", $messageData['metadata']);
        
        if ($stmt->execute()) {
            $messageId = $this->conn->lastInsertId();
            
            // Mettre à jour la dernière activité de la session
            $this->updateSessionActivity($messageData['session_id']);
            
            // Mettre à jour le dernier actif du participant
            $this->updateParticipantActivity($messageData['session_id'], $messageData['user_id']);
            
            return $messageId;
        }
        
        return false;
    }

    private function updateSessionActivity($sessionId) {
        $query = "UPDATE " . $this->table_sessions . " SET last_activity = NOW() WHERE session_id = :session_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        $stmt->execute();
    }

    private function updateParticipantActivity($sessionId, $userId) {
        $query = "UPDATE " . $this->table_participants . " SET last_active = NOW() 
                  WHERE session_id = :session_id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
    }

    public function updateSession($sessionId, $updateData) {
        $query = "UPDATE " . $this->table_sessions . " SET ";
        $updates = [];
        $params = [':session_id' => $sessionId];
        
        foreach ($updateData as $key => $value) {
            $updates[] = "$key = :$key";
            $params[":$key"] = $value;
        }
        
        $updates[] = "last_activity = NOW()";
        $query .= implode(", ", $updates) . " WHERE session_id = :session_id";
        
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }

    public function leaveSession($sessionId, $userId) {
        $query = "DELETE FROM " . $this->table_participants . " 
                  WHERE session_id = :session_id AND user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        $stmt->bindParam(":user_id", $userId);
        
        if ($stmt->execute()) {
            // Vérifier s'il reste des participants
            $remaining = $this->getSessionParticipants($sessionId, $userId);
            if (empty($remaining)) {
                // Désactiver la session si plus de participants
                $this->updateSession($sessionId, ['is_active' => 0]);
            }
            
            return true;
        }
        
        return false;
    }

    public function getActiveParticipants($sessionId) {
        $query = "SELECT u.user_id, u.first_name, u.last_name, u.institution, sp.last_active
                  FROM " . $this->table_participants . " sp
                  LEFT JOIN users u ON sp.user_id = u.user_id
                  WHERE sp.session_id = :session_id 
                  AND sp.last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                  ORDER BY sp.last_active DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":session_id", $sessionId);
        
        if ($stmt->execute()) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }
}
?>