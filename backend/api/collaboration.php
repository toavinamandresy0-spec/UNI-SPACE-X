<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';
require_once '../config/constants.php';
require_once '../models/CollaborationModel.php';
require_once '../middleware/AuthMiddleware.php';
require_once '../utils/ResponseHandler.php';
require_once '../utils/DataValidator.php';

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $database = new DatabaseConfig();
    $db = $database->getConnection();
    
    $collaborationModel = new CollaborationModel($db);
    $auth = new AuthMiddleware($db);
    $responseHandler = new ResponseHandler();
    $validator = new DataValidator();

    $userData = $auth->authenticate();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';
            
            switch ($action) {
                case 'list':
                    // Lister les sessions de collaboration
                    $sessions = $collaborationModel->getCollaborationSessions($userData['user_id']);
                    $responseHandler->sendSuccess(['sessions' => $sessions]);
                    break;
                    
                case 'participants':
                    // Lister les participants d'une session
                    $sessionId = $_GET['session_id'] ?? null;
                    if (!$sessionId) {
                        $responseHandler->sendError('ID de session requis', API_BAD_REQUEST);
                    }
                    
                    $participants = $collaborationModel->getSessionParticipants($sessionId, $userData['user_id']);
                    $responseHandler->sendSuccess(['participants' => $participants]);
                    break;
                    
                case 'messages':
                    // Récupérer les messages d'une session
                    $sessionId = $_GET['session_id'] ?? null;
                    $limit = min(100, max(1, $_GET['limit'] ?? 50));
                    $offset = max(0, $_GET['offset'] ?? 0);
                    
                    if (!$sessionId) {
                        $responseHandler->sendError('ID de session requis', API_BAD_REQUEST);
                    }
                    
                    $messages = $collaborationModel->getSessionMessages($sessionId, $userData['user_id'], $limit, $offset);
                    $responseHandler->sendSuccess(['messages' => $messages]);
                    break;
                    
                default:
                    $responseHandler->sendError('Action non reconnue', API_BAD_REQUEST);
                    break;
            }
            break;

        case 'POST':
            $action = $input['action'] ?? 'create_session';
            
            switch ($action) {
                case 'create_session':
                    // Créer une nouvelle session de collaboration
                    $validationRules = [
                        'name' => ['required', 'string', 'max:255'],
                        'simulation_id' => ['required', 'integer'],
                        'description' => ['string', 'max:1000']
                    ];
                    
                    if (!$validator->validate($input, $validationRules)) {
                        $responseHandler->sendError('Données invalides', API_VALIDATION_ERROR);
                    }
                    
                    $sessionData = [
                        'name' => $input['name'],
                        'simulation_id' => $input['simulation_id'],
                        'description' => $input['description'] ?? '',
                        'created_by' => $userData['user_id'],
                        'access_code' => bin2hex(random_bytes(8))
                    ];
                    
                    $sessionId = $collaborationModel->createCollaborationSession($sessionData);
                    
                    if ($sessionId) {
                        $responseHandler->sendSuccess([
                            'session_id' => $sessionId,
                            'access_code' => $sessionData['access_code'],
                            'message' => 'Session de collaboration créée avec succès'
                        ], 201);
                    } else {
                        $responseHandler->sendError('Erreur lors de la création de la session', API_SERVER_ERROR);
                    }
                    break;
                    
                case 'join_session':
                    // Rejoindre une session de collaboration
                    $validationRules = [
                        'access_code' => ['required', 'string', 'size:16']
                    ];
                    
                    if (!$validator->validate($input, $validationRules)) {
                        $responseHandler->sendError('Code d\'accès invalide', API_VALIDATION_ERROR);
                    }
                    
                    $sessionId = $collaborationModel->joinCollaborationSession(
                        $input['access_code'], 
                        $userData['user_id']
                    );
                    
                    if ($sessionId) {
                        $responseHandler->sendSuccess([
                            'session_id' => $sessionId,
                            'message' => 'Session rejointe avec succès'
                        ]);
                    } else {
                        $responseHandler->sendError('Code d\'accès invalide ou session non trouvée', API_NOT_FOUND);
                    }
                    break;
                    
                case 'send_message':
                    // Envoyer un message dans une session
                    $validationRules = [
                        'session_id' => ['required', 'integer'],
                        'message' => ['required', 'string', 'max:2000'],
                        'message_type' => ['in:text,annotation,command']
                    ];
                    
                    if (!$validator->validate($input, $validationRules)) {
                        $responseHandler->sendError('Données de message invalides', API_VALIDATION_ERROR);
                    }
                    
                    $messageData = [
                        'session_id' => $input['session_id'],
                        'user_id' => $userData['user_id'],
                        'message' => $input['message'],
                        'message_type' => $input['message_type'] ?? 'text',
                        'metadata' => isset($input['metadata']) ? json_encode($input['metadata']) : null
                    ];
                    
                    $messageId = $collaborationModel->addMessage($messageData);
                    
                    if ($messageId) {
                        $responseHandler->sendSuccess([
                            'message_id' => $messageId,
                            'timestamp' => date('Y-m-d H:i:s'),
                            'message' => 'Message envoyé avec succès'
                        ]);
                    } else {
                        $responseHandler->sendError('Erreur lors de l\'envoi du message', API_SERVER_ERROR);
                    }
                    break;
                    
                default:
                    $responseHandler->sendError('Action non reconnue', API_BAD_REQUEST);
                    break;
            }
            break;

        case 'PUT':
            // Mettre à jour une session de collaboration
            $validationRules = [
                'session_id' => ['required', 'integer'],
                'name' => ['string', 'max:255'],
                'description' => ['string', 'max:1000'],
                'is_active' => ['boolean']
            ];
            
            if (!$validator->validate($input, $validationRules)) {
                $responseHandler->sendError('Données invalides', API_VALIDATION_ERROR);
            }
            
            // Vérifier que l'utilisateur est le créateur de la session
            $session = $collaborationModel->getSession($input['session_id']);
            if (!$session || $session['created_by'] != $userData['user_id']) {
                $responseHandler->sendError('Modification non autorisée', API_FORBIDDEN);
            }
            
            $updateData = array_filter([
                'name' => $input['name'] ?? null,
                'description' => $input['description'] ?? null,
                'is_active' => $input['is_active'] ?? null
            ]);
            
            if ($collaborationModel->updateSession($input['session_id'], $updateData)) {
                $responseHandler->sendSuccess(['message' => 'Session mise à jour avec succès']);
            } else {
                $responseHandler->sendError('Erreur lors de la mise à jour', API_SERVER_ERROR);
            }
            break;

        case 'DELETE':
            // Quitter une session de collaboration
            $sessionId = $input['session_id'] ?? null;
            if (!$sessionId) {
                $responseHandler->sendError('ID de session requis', API_BAD_REQUEST);
            }
            
            if ($collaborationModel->leaveSession($sessionId, $userData['user_id'])) {
                $responseHandler->sendSuccess(['message' => 'Session quittée avec succès']);
            } else {
                $responseHandler->sendError('Erreur lors de la sortie de la session', API_SERVER_ERROR);
            }
            break;

        default:
            $responseHandler->sendError('Méthode non autorisée', API_METHOD_NOT_ALLOWED);
            break;
    }

} catch (Exception $e) {
    error_log("Collaboration API Error: " . $e->getMessage());
    $responseHandler->sendError('Erreur interne du serveur', API_SERVER_ERROR);
}
?>