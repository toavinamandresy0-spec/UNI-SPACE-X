<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';
require_once '../config/constants.php';
require_once '../models/UserModel.php';
require_once '../utils/ResponseHandler.php';
require_once '../utils/DataValidator.php';

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $database = new DatabaseConfig();
    $db = $database->getConnection();
    
    $userModel = new UserModel($db);
    $responseHandler = new ResponseHandler();
    $validator = new DataValidator();

    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    switch ($method) {
        case 'POST':
            $action = $input['action'] ?? 'login';
            
            switch ($action) {
                case 'login':
                    // Connexion utilisateur
                    $validationRules = [
                        'email' => ['required', 'email'],
                        'password' => ['required', 'string', 'min:6']
                    ];
                    
                    if (!$validator->validate($input, $validationRules)) {
                        $responseHandler->sendError('Données de connexion invalides', API_VALIDATION_ERROR);
                    }
                    
                    $user = $userModel->authenticate($input['email'], $input['password']);
                    
                    if ($user) {
                        // Générer le token JWT
                        $token = $userModel->generateAuthToken($user['user_id']);
                        
                        // Mettre à jour la dernière connexion
                        $userModel->updateLastLogin($user['user_id']);
                        
                        $responseHandler->sendSuccess([
                            'token' => $token,
                            'user' => [
                                'user_id' => $user['user_id'],
                                'email' => $user['email'],
                                'first_name' => $user['first_name'],
                                'last_name' => $user['last_name'],
                                'access_level' => $user['access_level'],
                                'institution' => $user['institution']
                            ],
                            'expires_in' => TOKEN_EXPIRY
                        ]);
                    } else {
                        $responseHandler->sendError('Email ou mot de passe incorrect', API_UNAUTHORIZED);
                    }
                    break;
                    
                case 'register':
                    // Inscription utilisateur
                    $validationRules = [
                        'email' => ['required', 'email'],
                        'password' => ['required', 'string', 'min:8'],
                        'first_name' => ['required', 'string', 'max:100'],
                        'last_name' => ['required', 'string', 'max:100'],
                        'institution' => ['required', 'string', 'max:255'],
                        'research_domain' => ['required', 'string']
                    ];
                    
                    if (!$validator->validate($input, $validationRules)) {
                        $responseHandler->sendError('Données d\'inscription invalides', API_VALIDATION_ERROR);
                    }
                    
                    // Vérifier si l'email existe déjà
                    if ($userModel->emailExists($input['email'])) {
                        $responseHandler->sendError('Cet email est déjà utilisé', API_VALIDATION_ERROR);
                    }
                    
                    $userData = [
                        'email' => $input['email'],
                        'password' => $input['password'],
                        'first_name' => $input['first_name'],
                        'last_name' => $input['last_name'],
                        'institution' => $input['institution'],
                        'research_domain' => $input['research_domain'],
                        'access_level' => ACCESS_LEVEL_RESEARCHER
                    ];
                    
                    $userId = $userModel->createUser($userData);
                    
                    if ($userId) {
                        $token = $userModel->generateAuthToken($userId);
                        
                        $responseHandler->sendSuccess([
                            'token' => $token,
                            'user' => [
                                'user_id' => $userId,
                                'email' => $userData['email'],
                                'first_name' => $userData['first_name'],
                                'last_name' => $userData['last_name'],
                                'access_level' => $userData['access_level'],
                                'institution' => $userData['institution']
                            ],
                            'message' => 'Compte créé avec succès'
                        ], 201);
                    } else {
                        $responseHandler->sendError('Erreur lors de la création du compte', API_SERVER_ERROR);
                    }
                    break;
                    
                case 'refresh':
                    // Rafraîchir le token
                    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
                    
                    if (!$token) {
                        $responseHandler->sendError('Token manquant', API_UNAUTHORIZED);
                    }
                    
                    // Extraire le token du header
                    $token = str_replace('Bearer ', '', $token);
                    
                    $newToken = $userModel->refreshToken($token);
                    
                    if ($newToken) {
                        $responseHandler->sendSuccess([
                            'token' => $newToken,
                            'expires_in' => TOKEN_EXPIRY
                        ]);
                    } else {
                        $responseHandler->sendError('Token invalide ou expiré', API_UNAUTHORIZED);
                    }
                    break;
                    
                case 'logout':
                    // Déconnexion
                    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
                    
                    if ($token) {
                        $token = str_replace('Bearer ', '', $token);
                        $userModel->invalidateToken($token);
                    }
                    
                    $responseHandler->sendSuccess(['message' => 'Déconnexion réussie']);
                    break;
                    
                default:
                    $responseHandler->sendError('Action non reconnue', API_BAD_REQUEST);
                    break;
            }
            break;

        default:
            $responseHandler->sendError('Méthode non autorisée', API_METHOD_NOT_ALLOWED);
            break;
    }

} catch (Exception $e) {
    error_log("Auth API Error: " . $e->getMessage());
    $responseHandler->sendError('Erreur interne du serveur', API_SERVER_ERROR);
}
?>