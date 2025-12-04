<?php
class UserModel {
    private $conn;
    private $table_name = "users";
    private $table_tokens = "user_tokens";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function authenticate($email, $password) {
        $query = "SELECT user_id, email, password, first_name, last_name, 
                         institution, research_domain, access_level, is_active
                  FROM " . $this->table_name . " 
                  WHERE email = :email AND is_active = 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        
        if ($stmt->execute() && $user = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (password_verify($password, $user['password'])) {
                // Retirer le mot de passe du résultat
                unset($user['password']);
                return $user;
            }
        }
        
        return false;
    }

    public function emailExists($email) {
        $query = "SELECT user_id FROM " . $this->table_name . " WHERE email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        return $stmt->execute() && $stmt->fetch();
    }

    public function createUser($userData) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (email, password, first_name, last_name, institution, research_domain, access_level, created_at) 
                  VALUES (:email, :password, :first_name, :last_name, :institution, :research_domain, :access_level, NOW())";
        
        $stmt = $this->conn->prepare($query);
        
        // Hasher le mot de passe
        $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);
        
        $stmt->bindParam(":email", $userData['email']);
        $stmt->bindParam(":password", $hashedPassword);
        $stmt->bindParam(":first_name", $userData['first_name']);
        $stmt->bindParam(":last_name", $userData['last_name']);
        $stmt->bindParam(":institution", $userData['institution']);
        $stmt->bindParam(":research_domain", $userData['research_domain']);
        $stmt->bindParam(":access_level", $userData['access_level']);
        
        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function generateAuthToken($userId) {
        // Générer un token unique
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + TOKEN_EXPIRY);
        
        $query = "INSERT INTO " . $this->table_tokens . " 
                  (user_id, token, expires_at, created_at) 
                  VALUES (:user_id, :token, :expires_at, NOW()) 
                  ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->bindParam(":token", $token);
        $stmt->bindParam(":expires_at", $expiresAt);
        
        if ($stmt->execute()) {
            return $token;
        }
        return false;
    }

    public function validateToken($token) {
        $query = "SELECT ut.*, u.email, u.first_name, u.last_name, u.access_level, u.institution
                  FROM " . $this->table_tokens . " ut
                  LEFT JOIN " . $this->table_name . " u ON ut.user_id = u.user_id
                  WHERE ut.token = :token AND ut.expires_at > NOW() AND u.is_active = 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":token", $token);
        
        if ($stmt->execute() && $tokenData = $stmt->fetch(PDO::FETCH_ASSOC)) {
            return [
                'user_id' => $tokenData['user_id'],
                'email' => $tokenData['email'],
                'first_name' => $tokenData['first_name'],
                'last_name' => $tokenData['last_name'],
                'access_level' => $tokenData['access_level'],
                'institution' => $tokenData['institution']
            ];
        }
        
        return false;
    }

    public function refreshToken($oldToken) {
        // Valider l'ancien token
        $userData = $this->validateToken($oldToken);
        
        if ($userData) {
            // Générer un nouveau token
            $newToken = $this->generateAuthToken($userData['user_id']);
            
            // Invalider l'ancien token
            $this->invalidateToken($oldToken);
            
            return $newToken;
        }
        
        return false;
    }

    public function invalidateToken($token) {
        $query = "DELETE FROM " . $this->table_tokens . " WHERE token = :token";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":token", $token);
        return $stmt->execute();
    }

    public function invalidateAllUserTokens($userId) {
        $query = "DELETE FROM " . $this->table_tokens . " WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        return $stmt->execute();
    }

    public function updateLastLogin($userId) {
        $query = "UPDATE " . $this->table_name . " SET last_login = NOW() WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        return $stmt->execute();
    }

    public function getUserProfile($userId) {
        $query = "SELECT user_id, email, first_name, last_name, institution, 
                         research_domain, access_level, created_at, last_login
                  FROM " . $this->table_name . " 
                  WHERE user_id = :user_id AND is_active = 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        
        if ($stmt->execute()) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return false;
    }

    public function updateUserProfile($userId, $updateData) {
        $query = "UPDATE " . $this->table_name . " SET ";
        $updates = [];
        $params = [':user_id' => $userId];
        
        $allowedFields = ['first_name', 'last_name', 'institution', 'research_domain'];
        
        foreach ($updateData as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $updates[] = "$key = :$key";
                $params[":$key"] = $value;
            }
        }
        
        if (empty($updates)) {
            return false;
        }
        
        $query .= implode(", ", $updates) . " WHERE user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }

    public function changePassword($userId, $currentPassword, $newPassword) {
        // Vérifier le mot de passe actuel
        $query = "SELECT password FROM " . $this->table_name . " WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        
        if ($stmt->execute() && $user = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (password_verify($currentPassword, $user['password'])) {
                // Mettre à jour avec le nouveau mot de passe
                $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);
                
                $updateQuery = "UPDATE " . $this->table_name . " SET password = :password WHERE user_id = :user_id";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->bindParam(":password", $hashedNewPassword);
                $updateStmt->bindParam(":user_id", $userId);
                
                if ($updateStmt->execute()) {
                    // Invalider tous les tokens existants
                    $this->invalidateAllUserTokens($userId);
                    return true;
                }
            }
        }
        
        return false;
    }

    public function getUsersByInstitution($institution) {
        $query = "SELECT user_id, first_name, last_name, email, research_domain, created_at
                  FROM " . $this->table_name . " 
                  WHERE institution = :institution AND is_active = 1
                  ORDER BY first_name, last_name";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":institution", $institution);
        
        if ($stmt->execute()) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }
}
?>